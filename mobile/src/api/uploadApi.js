import { API_BASE_URL } from "../config";
import { useAuthStore } from "../store/authStore";
function pickName(file, fallback) {
  if (file && file.name) return String(file.name);
  const tail = String((file && file.uri) || "").split("?")[0].split("/").pop();
  if (tail && tail.indexOf(".") > 0) return tail;
  return fallback;
}
function pickType(file, fallback) {
  if (file && file.mimeType) return file.mimeType;
  if (file && file.type) return file.type;
  return fallback;
}
export function uploadFileWithProgress(file, kind, hooks) {
  const onProgress = hooks && hooks.onProgress;
  const signal = hooks && hooks.signal;
  let xhr = null;
  let cancelled = false;
  const promise = new Promise(function (resolve, reject) {
    let settled = false;
    function done(fn, v) { if (!settled) { settled = true; fn(v); } }
    function fail(msg, status) {
      const e = new Error(msg);
      e.status = status;
      done(reject, e);
    }
    if (signal && signal.aborted) { fail("Upload cancelled."); return; }
    const form = new FormData();
    const isVideo = kind !== "thumbnail";
    form.append("file", {
      uri: file.uri,
      name: pickName(file, isVideo ? "upload.mp4" : "thumbnail.jpg"),
      type: pickType(file, isVideo ? "video/mp4" : "image/jpeg"),
    });
    xhr = new XMLHttpRequest();
    function onAbort() { try { xhr.abort(); } catch (e) {} }
    if (signal && signal.addEventListener) signal.addEventListener("abort", onAbort);
    xhr.open("POST", API_BASE_URL + "/upload");
    try {
      const t = useAuthStore.getState().token;
      if (t) xhr.setRequestHeader("Authorization", "Bearer " + t);
    } catch (e) {}
    if (xhr.upload && xhr.upload.addEventListener) {
      xhr.upload.addEventListener("progress", function (ev) {
        let pct = 0;
        if (ev.lengthComputable && ev.total > 0) pct = Math.round((ev.loaded / ev.total) * 100);
        else if (ev.loaded > 0) pct = 99;
        if (pct < 0) pct = 0;
        if (pct > 100) pct = 100;
        if (typeof onProgress === "function") { try { onProgress(pct); } catch (e) {} }
      });
    }
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4 || settled) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (!data || !data.url) { fail("Upload finished without a media URL."); return; }
          done(resolve, data);
        } catch (e) { fail("Upload response was unreadable."); }
      } else {
        let msg = "Upload failed. Please retry.";
        try {
          const data = JSON.parse(xhr.responseText || "{}");
          msg = data.error || data.message || msg;
        } catch (e) {}
        if (xhr.status === 401) msg = "Session expired. Log in again, then retry.";
        if (xhr.status === 413) msg = "File exceeds the 500MB server limit.";
        if (xhr.status === 0) msg = "Upload cancelled.";
        fail(msg, xhr.status);
      }
    };
    xhr.onerror = function () { fail("Network error during upload. Please retry."); };
    xhr.onabort = function () { fail("Upload cancelled."); };
    xhr.ontimeout = function () { fail("Upload timed out. Please retry."); };
    xhr.send(form);
  });
  return {
    promise: promise,
    cancel: function () { cancelled = true; try { if (xhr) xhr.abort(); } catch (e) {} },
  };
}
export const uploadFile = async function (file, callback) {
  const r = uploadFileWithProgress(file, "video", {});
  const data = await r.promise;
  if (typeof callback === "function") { try { callback(data.url); } catch (e) {} }
  return data;
};
