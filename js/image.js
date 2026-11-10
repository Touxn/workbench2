/* ============================================================
   图寻工作台 图片处理
   只做一件事：把用户选的图片压成长边 1600 的 JPEG，另出一张缩略图
   失败时抛出带 code 的 Error，交给上层决定怎么提示
   ============================================================ */
(function (global) {
  'use strict';

  var TW = global.TW = global.TW || {};

  var MAX_EDGE = 1600;
  var THUMB_EDGE = 320;
  var QUALITY = 0.82;
  var THUMB_QUALITY = 0.7;
  var MAX_BYTES = 20 * 1024 * 1024;

  function fail(code, message) {
    var err = new Error(message);
    err.code = code;
    return err;
  }

  /* 解不开的图片多为 HEIC 这类浏览器不认的格式，提示用户先转 JPG */
  function decodeError() {
    return fail('E_IMAGE_DECODE', '这张图片打不开，先转成 JPG 再试');
  }

  function badImage(message) {
    return fail('E_INVALID_INPUT', message);
  }

  /* 老浏览器没有 createImageBitmap，用 <img> 加载后再绘制 */
  function fromImgTag(file) {
    return new Promise(function (resolve, reject) {
      var url = global.URL.createObjectURL(file);
      var img = new global.Image();
      img.onload = function () {
        resolve({
          source: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
          release: function () { global.URL.revokeObjectURL(url); }
        });
      };
      img.onerror = function () {
        global.URL.revokeObjectURL(url);
        reject(decodeError());
      };
      img.src = url;
    });
  }

  /* 解码时带上旋转信息，手机竖拍的照片才不会躺倒 */
  function decode(file) {
    if (typeof global.createImageBitmap !== 'function') return fromImgTag(file);

    return global.createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (bitmap) {
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: function () { bitmap.close(); }
      };
    }, function () {
      /* 部分浏览器不接受 imageOrientation 参数，退回 <img> 方式 */
      return fromImgTag(file);
    });
  }

  function dataUrlToBlob(dataUrl) {
    var parts = dataUrl.split(',');
    var mime = /:(.*?);/.exec(parts[0])[1];
    var binary = global.atob(parts[1]);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new global.Blob([bytes], { type: mime });
  }

  function toJpeg(canvas, quality) {
    return new Promise(function (resolve, reject) {
      function viaDataUrl() {
        try {
          resolve(dataUrlToBlob(canvas.toDataURL('image/jpeg', quality)));
        } catch (e) {
          reject(decodeError());
        }
      }

      if (typeof canvas.toBlob !== 'function') {
        viaDataUrl();
        return;
      }

      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else viaDataUrl();
      }, 'image/jpeg', quality);
    });
  }

  /* 按长边缩放到上限以内，比例不变。只缩不放，小图保持原尺寸 */
  function resize(image, edge, quality) {
    var scale = Math.min(1, edge / Math.max(image.width, image.height));
    var width = Math.max(1, Math.round(image.width * scale));
    var height = Math.max(1, Math.round(image.height * scale));

    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    var ctx = canvas.getContext('2d');
    /* 透明区域导出成 JPEG 会变黑，先铺一层白底 */
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image.source, 0, 0, width, height);

    return toJpeg(canvas, quality).then(function (blob) {
      return { blob: blob, width: width, height: height };
    });
  }

  function compress(file) {
    if (!file) return Promise.reject(badImage('请选择一张图片'));
    if (!/^image\//.test(String(file.type || ''))) return Promise.reject(badImage('只能选图片文件'));
    if (file.size > MAX_BYTES) return Promise.reject(badImage('图片超过 20MB，先压小一点再选'));

    return decode(file).then(function (image) {
      return Promise.all([
        resize(image, MAX_EDGE, QUALITY),
        resize(image, THUMB_EDGE, THUMB_QUALITY)
      ]).then(function (out) {
        image.release();
        return {
          blob: out[0].blob,
          width: out[0].width,
          height: out[0].height,
          bytes: out[0].blob.size,
          thumb: out[1].blob
        };
      }, function (err) {
        image.release();
        throw err;
      });
    });
  }

  TW.Image = {
    maxBytes: MAX_BYTES,
    maxEdge: MAX_EDGE,
    thumbEdge: THUMB_EDGE,
    compress: compress
  };

})(window);
