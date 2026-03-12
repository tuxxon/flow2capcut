/**
 * Electron IPC Handler - Video Generation
 *
 * Text-to-Video (T2V), Image-to-Video (I2V) DOM automation,
 * and video status polling.
 */

import { randomUUID } from 'node:crypto'

/**
 * Register video-generation-related IPC handlers.
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {object} deps - Shared dependencies from main process
 */
export function registerVideoIPC(ipcMain, deps) {
  const {
    getFlowView, getMainWindow, trustedClickOnFlowView, sessionFetch, flowPageFetch,
    parseFlowResponse, getRecaptchaToken, configureFlowMode, switchFlowToVideoMode,
    getCapturedProjectId, setCapturedProjectId,
    getPendingVideoGeneration, setPendingVideoGeneration,
    SESSION_URL, VIDEO_T2V_URL, VIDEO_I2V_URL, VIDEO_STATUS_URL,
    API_HEADERS, FLOW_URL,
  } = deps

  // LOCAL helper — 비디오 응답에서 generation ID (UUID) 추출
  function extractVideoGenerationId(data) {
    const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '').trim())
    // media[].name (video entries)
    if (Array.isArray(data?.media)) {
      for (const m of data.media) {
        if ((m?.video || /video/i.test(String(m?.mediaMetadata?.mediaType || ''))) && isUuid(m?.name)) {
          return m.name
        }
      }
    }
    // workflows[].metadata.primaryMediaId
    if (Array.isArray(data?.workflows)) {
      for (const w of data.workflows) {
        if (isUuid(w?.metadata?.primaryMediaId)) return w.metadata.primaryMediaId
      }
    }
    // Legacy fallbacks
    return data?.asyncVideoGenerationOperations?.[0]?.operationId
      || data?.responses?.[0]?.generationId
      || null
  }

  // Text-to-Video generation (DOM 자동화 — 페이지가 reCAPTCHA 자체 처리)
  ipcMain.handle('flow:generate-video-t2v', async (event, {
    token, prompt, projectId, model, aspectRatio, duration
  }) => {
    const flowView = getFlowView()
    const mainWindow = getMainWindow()
    if (!prompt) return { success: false, error: 'No prompt' }
    if (!flowView) return { success: false, error: 'Flow view not ready' }

    console.log('[Flow Video T2V] Starting DOM-triggered video generation:', prompt?.substring(0, 50))

    try {
      // 0. Flow 프로젝트 페이지 확인
      const currentUrl = flowView.webContents.getURL()
      if (!currentUrl.includes('/project/') && !currentUrl.includes('/tools/flow/')) {
        return { success: false, error: 'Not on Flow project page. Please open a Flow project first.' }
      }

      // 1. 비디오 모드로 전환
      const modeResult = await switchFlowToVideoMode()
      if (!modeResult.success) {
        return { success: false, error: modeResult.error || 'Failed to switch to video mode' }
      }
      console.log('[Flow Video T2V] Video mode active:', modeResult.method)

      // 2. 프롬프트 입력 (이미지와 동일한 Slate 에디터 사용)
      const promptBounds = flowView.getBounds()
      const promptWasHidden = (promptBounds.width === 0 || promptBounds.height === 0)
      if (promptWasHidden) {
        const { width, height } = mainWindow.getContentBounds()
        flowView.setBounds({ x: width + 5000, y: 0, width, height })
        await new Promise(r => setTimeout(r, 300))
      }

      const promptResult = await flowView.webContents.executeJavaScript(`
        (async function() {
          const promptText = ${JSON.stringify(prompt)};
          const sleep = (ms) => new Promise(r => setTimeout(r, ms));

          // Slate editor 찾기
          let editor = document.querySelector("[data-slate-editor='true']");
          if (!editor) editor = document.querySelector("div[role='textbox'][contenteditable='true']:not(#af-bot-panel *)");
          if (!editor) editor = document.querySelector('[contenteditable="true"]:not([aria-hidden])');

          if (!editor) return { success: false, error: 'Editor not found' };

          const isSlate = !!(editor.matches?.("[data-slate-editor='true']") || editor.querySelector?.("[data-slate-node]"));

          // Slate React API로 프롬프트 주입
          let injected = false;
          if (isSlate) {
            try {
              const reactKeys = Object.keys(editor).filter(k => k.startsWith('__react'));
              let slateEditor = null;
              for (const key of reactKeys) {
                const stack = [editor[key]];
                const visited = new Set();
                let guard = 0;
                while (stack.length > 0 && guard < 5000) {
                  const node = stack.pop(); guard++;
                  if (!node || typeof node !== 'object' || visited.has(node)) continue;
                  visited.add(node);
                  const candidate = node?.memoizedProps?.node || node?.memoizedProps?.editor
                    || node?.pendingProps?.node || node?.pendingProps?.editor
                    || node?.stateNode?.editor || node?.editor;
                  if (candidate && typeof candidate.apply === 'function') { slateEditor = candidate; break; }
                  if (node.child) stack.push(node.child);
                  if (node.sibling) stack.push(node.sibling);
                  if (node.return) stack.push(node.return);
                  if (node.alternate) stack.push(node.alternate);
                }
                if (slateEditor) break;
              }
              if (slateEditor) {
                try {
                  const existingText = slateEditor.children?.[0]?.children?.[0]?.text || '';
                  if (existingText) slateEditor.apply({ type: 'remove_text', path: [0, 0], offset: 0, text: existingText });
                } catch {}
                slateEditor.apply({ type: 'insert_text', path: [0, 0], offset: 0, text: promptText });
                if (typeof slateEditor.onChange === 'function') slateEditor.onChange();
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                await sleep(200);
                const modelText = (slateEditor.children?.[0]?.children?.[0]?.text || '').trim();
                if (modelText && modelText.includes(promptText.slice(0, 40))) injected = true;
              }
            } catch {}
          }

          // Fallback: execCommand
          if (!injected) {
            try {
              editor.focus(); editor.click(); await sleep(100);
              if (isSlate) {
                const sel = window.getSelection(); const range = document.createRange();
                const stringNodes = Array.from(editor.querySelectorAll('[data-slate-string]'))
                  .map(n => n.firstChild).filter(n => n && n.nodeType === Node.TEXT_NODE);
                if (stringNodes.length > 0) {
                  range.setStart(stringNodes[0], 0);
                  const last = stringNodes[stringNodes.length - 1];
                  range.setEnd(last, (last.textContent || '').length);
                } else {
                  const zeroNode = Array.from(editor.querySelectorAll('[data-slate-zero-width]'))
                    .map(n => n.firstChild).find(n => n && n.nodeType === Node.TEXT_NODE);
                  if (zeroNode) { range.setStart(zeroNode, 0); range.setEnd(zeroNode, (zeroNode.textContent || '').length); }
                  else range.selectNodeContents(editor);
                }
                sel.removeAllRanges(); sel.addRange(range);
              } else {
                document.execCommand('selectAll', false, null);
              }
              document.execCommand('delete', false, null); await sleep(50);
              try { editor.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: promptText })); } catch {}
              const inserted = document.execCommand('insertText', false, promptText);
              if (inserted) { injected = true; }
            } catch {}
          }

          if (!injected) return { success: false, error: 'Prompt injection failed' };
          await sleep(500);
          return { success: true };
        })()
      `)

      if (promptWasHidden) {
        flowView.setBounds(promptBounds)
        await new Promise(r => setTimeout(r, 200))
      }

      if (!promptResult?.success) {
        return { success: false, error: promptResult?.error || 'Prompt injection failed' }
      }
      console.log('[Flow Video T2V] Prompt injected successfully')

      // 3. CDP 비디오 응답 캡처 Promise 설정
      let resolveVideo = null
      let videoTimeout = null
      const videoResponsePromise = new Promise((resolve) => {
        videoTimeout = setTimeout(() => {
          if (getPendingVideoGeneration()) {
            setPendingVideoGeneration(null)
            resolve({ error: true, message: 'Video response timeout (30s)' })
          }
        }, 30000) // 비디오 제출은 이미지보다 빠름 (초기 응답만 캡처)
        resolveVideo = resolve
      })

      // 4. Generate 버튼 Trusted Click
      const generateBtnSelector = `(function() {
        try {
          const xr = document.evaluate("//button[.//i[text()='arrow_forward']]",
            document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          if (xr.singleNodeValue && !xr.singleNodeValue.disabled) return xr.singleNodeValue;
        } catch {}
        for (const b of document.querySelectorAll('button')) {
          for (const icon of b.querySelectorAll('i')) {
            if (icon.textContent.trim() === 'arrow_forward' && !b.disabled) return b;
          }
        }
        return null;
      })()`

      const clickResult = await trustedClickOnFlowView(generateBtnSelector)
      console.log('[Flow Video T2V] Trusted click result:', clickResult)

      if (!clickResult?.success) {
        clearTimeout(videoTimeout)
        return { success: false, error: clickResult?.error || 'Failed to click Generate button' }
      }

      // ★ 클릭 직후 pendingVideoGeneration 설정
      const videoSetAt = Date.now() / 1000 - 2
      setPendingVideoGeneration({
        setAt: videoSetAt,
        resolve: (result) => {
          clearTimeout(videoTimeout)
          resolveVideo(result)
        }
      })
      console.log('[Flow Video T2V] pendingVideoGeneration set, waiting for CDP capture...')

      // 5. 비디오 API 응답 대기
      const netResult = await videoResponsePromise

      if (netResult.error) {
        console.warn('[Flow Video T2V] Video API failed:', netResult.message || `HTTP ${netResult.status}`)
        return { success: false, error: netResult.message || `HTTP ${netResult.status}: Video generation failed` }
      }

      // 6. 응답에서 generation ID 추출
      const data = parseFlowResponse(netResult.body)
      const generationId = extractVideoGenerationId(data)

      if (generationId) {
        console.log('[Flow Video T2V] Generation ID:', generationId)
        return { success: true, generationId }
      }

      return { success: false, error: `No generation ID. Response keys: ${Object.keys(data || {}).join(',')}` }
    } catch (e) {
      console.error('[Flow Video T2V] Error:', e.message)
      return { success: false, error: e.message }
    }
  })

  // Image-to-Video generation (DOM 자동화)
  // I2V는 비디오 모드에서 시작 이미지가 필요하므로, 직접 API 호출을 페이지 컨텍스트에서 실행
  // (Flow 페이지 UI에서 이미지 업로드 + I2V 모드 전환이 복잡하므로 인젝션 방식 사용)
  ipcMain.handle('flow:generate-video-i2v', async (event, {
    token, prompt, startImageMediaId, projectId, model, aspectRatio, duration
  }) => {
    const flowView = getFlowView()
    if (!token) return { success: false, error: 'No token' }
    if (!startImageMediaId) return { success: false, error: 'No start image mediaId' }
    if (!flowView) return { success: false, error: 'Flow view not ready' }

    console.log('[Flow Video I2V] Starting page-context video generation, mediaId:', startImageMediaId?.substring(0, 8))

    // I2V model
    const apiModelKey = String(model || '').toLowerCase().includes('quality')
      ? 'veo_3_1_i2v_quality_ultra_relaxed'
      : 'veo_3_1_i2v_s_fast_ultra_relaxed'

    const batchId = randomUUID()
    const pid = projectId || getCapturedProjectId() || ''
    const apiAspect = aspectRatio || 'VIDEO_ASPECT_RATIO_LANDSCAPE'

    // I2V는 AutoFlow와 동일하게 페이지 컨텍스트에서 직접 fetch 실행
    // credentials: "include"와 mode: "cors" 포함 (AutoFlow I2V 패턴)
    // 페이지가 reCAPTCHA를 자체적으로 로드하므로 grecaptcha.enterprise.execute가 유효
    try {
      const result = await flowView.webContents.executeJavaScript(`
        (async function() {
          try {
            // 1. reCAPTCHA 토큰 획득 (페이지 컨텍스트 — origin 일치)
            let recaptchaToken = '';
            try {
              const g = window.grecaptcha;
              if (g?.enterprise?.execute) {
                recaptchaToken = String(await g.enterprise.execute(
                  '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV',
                  { action: 'generate' }
                ) || '').trim();
              }
            } catch {}

            // 2. 액세스 토큰 획득 (세션 API에서)
            let accessToken = ${JSON.stringify(token)};
            if (!accessToken) {
              try {
                const sessResp = await fetch('${SESSION_URL}');
                if (sessResp.ok) {
                  const sessText = await sessResp.text();
                  const sessData = JSON.parse(sessText.replace(/^\\)\\]\\}',?\\s*/, '').trim());
                  accessToken = sessData?.access_token || sessData?.accessToken || '';
                }
              } catch {}
            }
            if (!accessToken) return { ok: false, error: 'no_access_token' };

            // 3. API 요청 본문
            const body = {
              mediaGenerationContext: { batchId: ${JSON.stringify(batchId)} },
              clientContext: {
                projectId: ${JSON.stringify(pid)},
                tool: 'PINHOLE',
                userPaygateTier: 'PAYGATE_TIER_TWO',
                sessionId: ';' + Date.now(),
                ...(recaptchaToken ? {
                  recaptchaContext: {
                    token: recaptchaToken,
                    applicationType: 'RECAPTCHA_APPLICATION_TYPE_WEB'
                  }
                } : {})
              },
              requests: [{
                aspectRatio: ${JSON.stringify(apiAspect)},
                seed: Math.floor(Math.random() * 2147483647),
                textInput: { structuredPrompt: { parts: [{ text: ${JSON.stringify(prompt || '')} }] } },
                videoModelKey: ${JSON.stringify(apiModelKey)},
                metadata: {},
                startImage: { mediaId: ${JSON.stringify(startImageMediaId)} }
              }],
              useV2ModelConfig: true
            };

            // 4. fetch 실행 (페이지 컨텍스트 — credentials: include로 쿠키 포함)
            const resp = await fetch('${VIDEO_I2V_URL}', {
              method: 'POST',
              mode: 'cors',
              credentials: 'include',
              headers: { authorization: 'Bearer ' + accessToken },
              body: JSON.stringify(body)
            });
            const text = await resp.text().catch(() => '');
            return { ok: resp.ok, status: resp.status, text };
          } catch (e) {
            return { ok: false, status: 0, error: e.message };
          }
        })()
      `)

      if (!result.ok) {
        console.error('[Flow Video I2V] HTTP', result.status, (result.text || result.error || '').substring(0, 200))
        return { success: false, error: `HTTP ${result.status}: ${(result.text || result.error || '').substring(0, 200)}` }
      }

      const data = parseFlowResponse(result.text)
      const generationId = extractVideoGenerationId(data)

      if (generationId) {
        console.log('[Flow Video I2V] Generation ID:', generationId)
        return { success: true, generationId }
      }

      return { success: false, error: `No generation ID. Response keys: ${Object.keys(data || {}).join(',')}` }
    } catch (e) {
      console.error('[Flow Video I2V] Error:', e.message)
      return { success: false, error: e.message }
    }
  })

  // Check video generation status (페이지 컨텍스트에서 실행 — origin 일치)
  ipcMain.handle('flow:check-video-status', async (event, { token, generationIds, projectId }) => {
    const flowView = getFlowView()
    if (!token) return { success: false, error: 'No token' }
    if (!flowView) return { success: false, error: 'Flow view not ready' }

    const pid = projectId || getCapturedProjectId() || ''

    try {
      // 페이지 컨텍스트에서 fetch 실행 (AutoFlow 동일 바디 구조)
      // AutoFlow: { media: [{ name: "<genId>", projectId: "<pid>" }] }
      const result = await flowView.webContents.executeJavaScript(`
        (async function() {
          try {
            const ids = ${JSON.stringify(generationIds)};
            const pid = ${JSON.stringify(pid)};
            const media = ids.map(name => pid ? { name, projectId: pid } : { name });
            const body = { media };
            const resp = await fetch('${VIDEO_STATUS_URL}', {
              method: 'POST',
              mode: 'cors',
              credentials: 'include',
              headers: { authorization: 'Bearer ' + ${JSON.stringify(token)} },
              body: JSON.stringify(body)
            });
            const text = await resp.text().catch(() => '');
            return { ok: resp.ok, status: resp.status, text };
          } catch (e) {
            return { ok: false, status: 0, text: e.message };
          }
        })()
      `)

      console.log('[Flow VideoStatus] HTTP', result.status, 'body length:', result.text?.length || 0)

      if (!result.ok) {
        console.warn('[Flow VideoStatus] Error:', result.text?.substring(0, 300))
        return { success: false, error: `HTTP ${result.status}: ${(result.text || '').substring(0, 200)}` }
      }

      const data = parseFlowResponse(result.text)
      console.log('[Flow VideoStatus] Parsed keys:', data ? Object.keys(data).join(',') : 'null')

      // AutoFlow 형식: media[].mediaMetadata.mediaStatus.mediaGenerationStatus
      const statuses = []

      // 방법 1: media[] 배열 (최신 API 응답 형식)
      if (Array.isArray(data?.media)) {
        for (const m of data.media) {
          const genStatus = m?.mediaMetadata?.mediaStatus?.mediaGenerationStatus || ''
          const mediaId = m?.name
          console.log('[Flow VideoStatus] media status:', genStatus, 'mediaId:', mediaId?.substring(0, 30))
          if (genStatus === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
            // 전체 media 객체 구조 디버깅
            const findUrls = (obj, path = '') => {
              if (!obj || typeof obj !== 'object') return []
              const urls = []
              for (const [k, v] of Object.entries(obj)) {
                if (typeof v === 'string' && (v.startsWith('http') || v.includes('googleapis') || v.includes('google'))) {
                  urls.push({ path: path + '.' + k, url: v.substring(0, 150) })
                } else if (typeof v === 'object' && v !== null) {
                  urls.push(...findUrls(v, path + '.' + k))
                }
              }
              return urls
            }
            const allUrls = findUrls(m, 'media')
            console.log('[Flow VideoStatus] ✅ URLs in response:', JSON.stringify(allUrls))
            console.log('[Flow VideoStatus] ✅ mediaMetadata keys:', JSON.stringify(Object.keys(m?.mediaMetadata || {})))

            // AutoFlow: 비디오 URL은 status 응답에서 직접 추출
            const meta = m?.mediaMetadata
            const videoUrl = meta?.videoData?.generatedVideo?.fifeUri
              || meta?.videoData?.generatedVideo?.url
              || meta?.videoData?.fifeUri
              || meta?.videoData?.url
              || meta?.imageData?.fifeUri
              || meta?.imageData?.url
              || m?.mediaData?.url
              || m?.generatedMedia?.url
              || m?.thumbnailUrl
              || m?.url
              || null
            console.log('[Flow VideoStatus] ✅ Complete! videoUrl:', videoUrl?.substring(0, 80))
            statuses.push({ status: 'complete', mediaId, videoUrl })
          } else if (genStatus.includes('FAILED') || genStatus.includes('ERROR')) {
            statuses.push({ status: 'failed', error: genStatus })
          } else {
            statuses.push({ status: 'pending', progress: null })
          }
        }
      }

      // 방법 2: responses[] / asyncVideoGenerationOperations[] (레거시)
      if (statuses.length === 0) {
        const results = data?.responses || data?.asyncVideoGenerationOperations || []
        console.log('[Flow VideoStatus] Legacy path, results count:', results.length)
        for (const r of results) {
          console.log('[Flow VideoStatus] Response item keys:', Object.keys(r).join(','),
            'done:', r.done, 'status:', r.status, 'state:', r.state)
          const done = r.done || r.status === 'COMPLETE' || r.state === 'COMPLETE'
          const failed = r.error || r.status === 'FAILED' || r.state === 'FAILED'
          const mediaId = r.result?.mediaGenerationId || r.mediaGenerationId || r.name
          const progress = r.progress || r.metadata?.progress

          if (failed) statuses.push({ status: 'failed', error: r.error?.message || 'Generation failed' })
          else if (done && mediaId) statuses.push({ status: 'complete', mediaId })
          else statuses.push({ status: 'pending', progress })
        }
      }

      // 아무 statuses도 못 뽑았으면 raw data 로깅
      if (statuses.length === 0) {
        console.warn('[Flow VideoStatus] No statuses parsed! Raw data (first 500):', JSON.stringify(data)?.substring(0, 500))
      }

      console.log('[Flow VideoStatus] Final statuses:', JSON.stringify(statuses))
      return { success: true, statuses }
    } catch (e) {
      console.error('[Flow VideoStatus] Exception:', e.message)
      return { success: false, error: e.message }
    }
  })
}
