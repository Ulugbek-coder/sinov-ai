// =============================================================
// Sinov AI — Verification Photo Capture (Feature 5)
// =============================================================
// Captures a security selfie of the student before the exam starts.
// Uses Gemini Vision to detect eyeglasses; if glasses are detected the
// student is asked to remove them and retake. After 3 consecutive
// Gemini failures (rate limit, network, etc.) the flow falls back to
// self-attestation so the student isn't blocked indefinitely.
//
// PUBLIC API
//   await VerificationPhoto.capture()
//     -> { dataUrl, glassesCheck: { ok, attempts, mode } } | null
//        (null = student cancelled / hardware unavailable)
//
// The dataUrl is a small JPEG (~480x640 @ 0.7 quality, ~30-80 KB).
// It is embedded in the PDF report and shown on the score page.
// The full-resolution image is NOT uploaded to Storage in this
// feature — we keep it as base64 inline in the submission doc.
// =============================================================

(function () {
  "use strict";

  // -----------------------------------------------------------------
  // 1. DOM scaffolding — lazy-created on first capture()
  // -----------------------------------------------------------------
  let _overlay = null;
  let _video = null;
  let _canvas = null;
  let _statusEl = null;
  let _previewImg = null;
  let _captureBtn = null;
  let _retakeBtn = null;
  let _confirmBtn = null;
  let _cancelBtn = null;
  let _instructionEl = null;
  let _stream = null;
  let _resolve = null;
  let _geminiFailureCount = 0;
  let _fallbackMode = false; // true after 3 Gemini failures

  function _buildOverlay() {
    if (_overlay) return;
    _overlay = document.createElement("div");
    _overlay.className = "sn-vp-overlay";
    _overlay.setAttribute("role", "dialog");
    _overlay.setAttribute("aria-modal", "true");
    _overlay.setAttribute("aria-labelledby", "snVpTitle");
    _overlay.innerHTML = `
      <div class="sn-vp-backdrop"></div>
      <div class="sn-vp-dialog">
        <div class="sn-vp-head">
          <h3 id="snVpTitle" class="sn-vp-title">Verification Photo</h3>
          <p class="sn-vp-sub">
            Take a clear photo for exam-security records.
            <span class="uz">Imtihon xavfsizligi uchun aniq surat oling.</span>
            <span class="ru">Сделайте чёткое фото для записи безопасности экзамена.</span>
          </p>
        </div>

        <div class="sn-vp-body">
          <div class="sn-vp-stage">
            <video class="sn-vp-video" autoplay playsinline muted></video>
            <img class="sn-vp-preview" alt="Captured photo" style="display:none" />
            <canvas class="sn-vp-canvas" style="display:none"></canvas>
            <div class="sn-vp-frame-overlay" aria-hidden="true">
              <svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="120" cy="150" rx="90" ry="115"
                         fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="3"
                         stroke-dasharray="8 6"/>
              </svg>
            </div>
          </div>

          <div class="sn-vp-instructions">
            <div class="sn-vp-instruction-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="6.5" cy="14" r="3.5"/>
                <circle cx="17.5" cy="14" r="3.5"/>
                <path d="M10 14h4"/>
                <path d="M3 9c1-2 2-2 3.5-2M21 9c-1-2-2-2-3.5-2"/>
              </svg>
            </div>
            <div class="sn-vp-instruction-text">
              <b>Please remove your eyeglasses before taking the photo.</b>
              Reflections from glasses can obscure your eyes. Look straight at the camera with neutral lighting.
              <span class="uz">Iltimos, suratga olishdan oldin ko'zoynagingizni yeching. Yorug'lik aks etishi ko'zlaringizni yashirishi mumkin. Kameraga to'g'ridan-to'g'ri qarang.</span>
              <span class="ru">Пожалуйста, снимите очки перед съёмкой. Блики от очков могут скрыть глаза. Смотрите прямо в камеру при нейтральном освещении.</span>
            </div>
          </div>

          <div class="sn-vp-status" aria-live="polite"></div>
        </div>

        <div class="sn-vp-foot">
          <button type="button" class="sn-btn-secondary sn-vp-cancel">Cancel exam</button>
          <button type="button" class="sn-btn-primary sn-vp-capture">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span class="sn-btn-text">Take Photo</span>
          </button>
          <button type="button" class="sn-btn-secondary sn-vp-retake" style="display:none">Retake</button>
          <button type="button" class="sn-btn-primary sn-vp-confirm" style="display:none">
            <span class="sn-btn-text">Confirm &amp; Continue</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(_overlay);

    _video = _overlay.querySelector(".sn-vp-video");
    _canvas = _overlay.querySelector(".sn-vp-canvas");
    _previewImg = _overlay.querySelector(".sn-vp-preview");
    _statusEl = _overlay.querySelector(".sn-vp-status");
    _instructionEl = _overlay.querySelector(".sn-vp-instructions");
    _captureBtn = _overlay.querySelector(".sn-vp-capture");
    _retakeBtn = _overlay.querySelector(".sn-vp-retake");
    _confirmBtn = _overlay.querySelector(".sn-vp-confirm");
    _cancelBtn = _overlay.querySelector(".sn-vp-cancel");

    _captureBtn.addEventListener("click", _onCaptureClick);
    _retakeBtn.addEventListener("click", _onRetakeClick);
    _confirmBtn.addEventListener("click", _onConfirmClick);
    _cancelBtn.addEventListener("click", function () {
      _close(null);
    });
  }

  // -----------------------------------------------------------------
  // 2. Webcam open/close
  // -----------------------------------------------------------------
  async function _openCamera() {
    try {
      _stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });
      _video.srcObject = _stream;
      return true;
    } catch (err) {
      console.error("[verification-photo] camera open failed", err);
      _setStatus(
        "Camera access is required for the verification photo. Please grant permission and try again.",
        "err",
      );
      _captureBtn.disabled = true;
      return false;
    }
  }

  function _closeCamera() {
    if (_stream) {
      _stream.getTracks().forEach(function (t) {
        t.stop();
      });
      _stream = null;
    }
    if (_video) _video.srcObject = null;
  }

  // -----------------------------------------------------------------
  // 3. Status helper
  // -----------------------------------------------------------------
  function _setStatus(text, kind) {
    if (!_statusEl) return;
    _statusEl.className =
      "sn-vp-status" + (kind ? " sn-vp-status-" + kind : "");
    _statusEl.innerHTML = text || "";
  }

  // -----------------------------------------------------------------
  // 4. Capture the current video frame to canvas + dataUrl
  // -----------------------------------------------------------------
  // The webcam stream is typically 640x480 (landscape, 4:3). For the
  // PDF report and scorecard we want a portrait crop (3:4) so the
  // student's face fills the frame and isn't distorted when drawn
  // into the PDF's portrait photo box.
  //
  // Strategy: center-crop the live frame to a portrait region of the
  // same height as the video, with width = height * 3/4.
  // For 480px tall video, crop width = 360px → 360x480 output.
  function _captureFrame() {
    if (!_video || !_video.videoWidth) return null;
    const vw = _video.videoWidth;
    const vh = _video.videoHeight;

    // Target portrait aspect 3:4
    const TARGET_RATIO = 3 / 4;
    let cropW, cropH, sx, sy;
    if (vw / vh > TARGET_RATIO) {
      // Video is wider than 3:4 (typical for 640x480) — crop sides
      cropH = vh;
      cropW = Math.round(vh * TARGET_RATIO);
      sx = Math.round((vw - cropW) / 2);
      sy = 0;
    } else {
      // Video is narrower than 3:4 — crop top/bottom
      cropW = vw;
      cropH = Math.round(vw / TARGET_RATIO);
      sx = 0;
      sy = Math.round((vh - cropH) / 2);
    }

    _canvas.width = cropW;
    _canvas.height = cropH;
    const ctx = _canvas.getContext("2d");
    // Mirror horizontally (selfie convention) so the captured photo
    // looks the same as the live preview the student saw.
    ctx.translate(cropW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(_video, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // 0.85 JPEG quality — enough for the small PDF box and the
    // scorecard preview; keeps the inline base64 under ~80 KB.
    return _canvas.toDataURL("image/jpeg", 0.85);
  }

  // -----------------------------------------------------------------
  // 5. Gemini glasses detection (Option B)
  //    Returns: { wearingGlasses: bool, ok: bool, error?: string }
  //    `ok: false` means the call failed (network, rate limit) and the
  //    caller should treat this as inconclusive, NOT as a "no glasses".
  // -----------------------------------------------------------------
  async function _detectGlasses(dataUrl) {
    if (!dataUrl)
      return { wearingGlasses: false, ok: false, error: "no_image" };
    // Strip data URL prefix to get raw base64
    const base64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, "");

    // Use the same proxy convention as the AI Feedback feature.
    // The proxy hides the API key from the client.
    const proxyUrl = "/api/gemini-vision";
    const prompt =
      "You are an image analyst. Look at this photo of a person and answer ONLY in JSON " +
      'with exactly this shape: {"wearingGlasses": true|false}. ' +
      "Consider any eyeglasses or spectacles. Sunglasses also count. " +
      "Reading glasses count. Frames without lenses still count. " +
      "Do not add any explanation. JSON only.";

    try {
      const resp = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Use Gemini Flash for vision — fast, in free tier.
          // The proxy handles model selection; we just pass intent.
          task: "glasses_detection",
          prompt: prompt,
          imageBase64: base64,
          mimeType: "image/jpeg",
        }),
      });
      if (!resp.ok) {
        return {
          wearingGlasses: false,
          ok: false,
          error: "http_" + resp.status,
        };
      }
      const json = await resp.json();
      // Expected shape from proxy: { text: "...the model's text..." }
      const text = (json && json.text) || "";
      // Extract the JSON object from the text (be forgiving about
      // surrounding markdown code fences or whitespace).
      const m = text.match(/\{[\s\S]*?\}/);
      if (!m) {
        return { wearingGlasses: false, ok: false, error: "parse_no_object" };
      }
      let parsed;
      try {
        parsed = JSON.parse(m[0]);
      } catch (e) {
        return { wearingGlasses: false, ok: false, error: "parse_invalid" };
      }
      return {
        wearingGlasses: !!parsed.wearingGlasses,
        ok: true,
      };
    } catch (err) {
      console.warn("[verification-photo] glasses detection failed", err);
      return {
        wearingGlasses: false,
        ok: false,
        error: (err && err.message) || "fetch_failed",
      };
    }
  }

  // -----------------------------------------------------------------
  // 6. Click handlers
  // -----------------------------------------------------------------
  let _capturedDataUrl = null;
  let _attemptCount = 0;

  async function _onCaptureClick() {
    _attemptCount += 1;
    _captureBtn.disabled = true;
    _setStatus(
      "Capturing photo…" +
        ' <span class="uz">Surat olinmoqda…</span>' +
        ' <span class="ru">Снимок делается…</span>',
      "info",
    );

    // Brief countdown before snap so the student can pose
    for (let n = 3; n >= 1; n--) {
      _setStatus(
        "<b>" +
          n +
          "</b>" +
          ' <span class="uz">Tayyor bo\'ling</span>' +
          ' <span class="ru">Приготовьтесь</span>',
        "info",
      );
      await new Promise(function (r) {
        setTimeout(r, 700);
      });
    }

    const dataUrl = _captureFrame();
    if (!dataUrl) {
      _setStatus("Could not capture frame. Please try again.", "err");
      _captureBtn.disabled = false;
      return;
    }
    _capturedDataUrl = dataUrl;

    // Show preview, hide live video
    _previewImg.src = dataUrl;
    _previewImg.style.display = "";
    _video.style.display = "none";

    // ----- Gemini glasses detection -----
    if (_fallbackMode) {
      // Already failed 3 times — skip detection, show fallback notice
      _showFallbackConfirm();
      return;
    }

    _setStatus(
      "AI checking for eyeglasses…" +
        ' <span class="uz">AI ko\'zoynak borligini tekshiryapti…</span>' +
        ' <span class="ru">ИИ проверяет наличие очков…</span>',
      "info",
    );
    const result = await _detectGlasses(dataUrl);

    if (!result.ok) {
      _geminiFailureCount += 1;
      console.warn(
        "[verification-photo] Gemini check failure",
        _geminiFailureCount,
        result.error,
      );
      if (_geminiFailureCount >= 3) {
        // Enter fallback mode and continue with this capture
        _fallbackMode = true;
        _showFallbackConfirm();
        return;
      }
      // Retry-prompt: ask the student to take another photo, this
      // time the detector will try again. (We do NOT auto-accept on
      // failure — it could be a glasses-wearer trying to game it.)
      _setStatus(
        "<b>AI check unavailable.</b> Please retake the photo so we can try again. " +
          "(Attempt " +
          _geminiFailureCount +
          " of 3)" +
          ' <span class="uz">AI tekshiruvi mavjud emas. Iltimos, qaytadan suratga oling.</span>' +
          ' <span class="ru">Проверка ИИ недоступна. Пожалуйста, переснимите фото.</span>',
        "warn",
      );
      _showRetakeOnly();
      return;
    }

    if (result.wearingGlasses) {
      _setStatus(
        "<b>Eyeglasses detected.</b> Please remove your glasses and take the photo again." +
          " <span class=\"uz\">Ko'zoynak aniqlandi. Iltimos, ko'zoynagingizni yeching va qaytadan suratga oling.</span>" +
          ' <span class="ru">Обнаружены очки. Пожалуйста, снимите очки и сделайте снимок снова.</span>',
        "warn",
      );
      _showRetakeOnly();
      return;
    }

    // All clear — let them confirm
    _setStatus(
      "<b>✓ AI check passed.</b> No eyeglasses detected. Confirm to continue." +
        ' <span class="uz">AI tekshiruvi muvaffaqiyatli o\'tdi. Davom etish uchun tasdiqlang.</span>' +
        ' <span class="ru">Проверка ИИ пройдена. Подтвердите, чтобы продолжить.</span>',
      "ok",
    );
    _showConfirm();
  }

  function _showRetakeOnly() {
    _captureBtn.style.display = "none";
    _confirmBtn.style.display = "none";
    _retakeBtn.style.display = "";
    _retakeBtn.disabled = false;
  }

  function _showConfirm() {
    _captureBtn.style.display = "none";
    _retakeBtn.style.display = "";
    _retakeBtn.disabled = false;
    _confirmBtn.style.display = "";
    _confirmBtn.disabled = false;
  }

  function _showFallbackConfirm() {
    _setStatus(
      "<b>AI glasses check is temporarily unavailable.</b> Please ensure you have removed your eyeglasses, " +
        "then confirm. The photo will still be recorded." +
        " <span class=\"uz\">AI ko'zoynak tekshiruvi vaqtincha ishlamayapti. Iltimos, ko'zoynagingizni yechganingizni tekshiring va tasdiqlang.</span>" +
        ' <span class="ru">Проверка очков ИИ временно недоступна. Пожалуйста, убедитесь, что вы сняли очки, и подтвердите.</span>',
      "warn",
    );
    _showConfirm();
  }

  function _onRetakeClick() {
    // Restore live preview
    _previewImg.style.display = "none";
    _video.style.display = "";
    _capturedDataUrl = null;
    _setStatus("", "");
    _captureBtn.style.display = "";
    _captureBtn.disabled = false;
    _retakeBtn.style.display = "none";
    _confirmBtn.style.display = "none";
  }

  function _onConfirmClick() {
    if (!_capturedDataUrl) return;
    _close({
      dataUrl: _capturedDataUrl,
      glassesCheck: {
        ok: !_fallbackMode,
        attempts: _attemptCount,
        mode: _fallbackMode ? "fallback_self_attestation" : "ai_verified",
        geminiFailures: _geminiFailureCount,
      },
    });
  }

  function _close(payload) {
    _closeCamera();
    if (_overlay) _overlay.style.display = "none";
    if (_resolve) {
      const fn = _resolve;
      _resolve = null;
      fn(payload);
    }
  }

  // -----------------------------------------------------------------
  // 7. Public capture() — returns Promise resolving when the student
  //    either confirms a photo or cancels.
  // -----------------------------------------------------------------
  async function capture() {
    _buildOverlay();
    // Reset state for a fresh run
    _geminiFailureCount = 0;
    _fallbackMode = false;
    _attemptCount = 0;
    _capturedDataUrl = null;
    _previewImg.style.display = "none";
    _video.style.display = "";
    _captureBtn.style.display = "";
    _captureBtn.disabled = true; // re-enable after camera opens
    _retakeBtn.style.display = "none";
    _confirmBtn.style.display = "none";
    _setStatus("", "");
    _overlay.style.display = "flex";

    const ok = await _openCamera();
    if (!ok) {
      // _setStatus already shows the error; keep the modal open so the
      // student can retry (close camera permission dialog, re-grant, etc.).
      _captureBtn.disabled = true;
      // Surface a retry button by re-enabling capture after a small delay,
      // so the student can click to retry getUserMedia.
      _captureBtn.textContent = "";
      const span = document.createElement("span");
      span.className = "sn-btn-text";
      span.textContent = "Retry Camera Access";
      _captureBtn.innerHTML = "";
      _captureBtn.appendChild(span);
      _captureBtn.disabled = false;
      _captureBtn.onclick = async function () {
        const ok2 = await _openCamera();
        if (ok2) {
          _captureBtn.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>' +
            '<circle cx="12" cy="13" r="4"/></svg>' +
            '<span class="sn-btn-text">Take Photo</span>';
          _captureBtn.onclick = null;
          _captureBtn.addEventListener("click", _onCaptureClick);
          _setStatus("", "");
        }
      };
    } else {
      _captureBtn.disabled = false;
    }

    return new Promise(function (resolve) {
      _resolve = resolve;
    });
  }

  // Public API
  window.VerificationPhoto = {
    capture: capture,
  };
})();
