/* product_form_uploads.js — direct-to-Cloudinary uploads for the admin product form.
 *
 * BEFORE: browser --(big multipart)--> Flask --(re-upload)--> Cloudinary.
 *         Every image crossed the network twice and the save request waited for
 *         both hops. This was ~80% of the total save time.
 * AFTER:  browser --(parallel uploads)--> Cloudinary
 *         browser --(tiny form with URL strings)--> Flask
 *         The save request itself is just a few SQL statements (~50–150 ms).
 *
 * How it works:
 *   1. Intercepts #productForm submit.
 *   2. If NEW files were chosen, fetches a one-time upload signature from
 *      /admin/cloudinary-sign, uploads all files to Cloudinary IN PARALLEL
 *      with a progress overlay, and writes the returned URLs into hidden inputs
 *      (img_primary_url, size_chart_url, gallery_urls JSON, var_img_url[]).
 *   3. If NO new files were chosen (the common case when editing text/prices/
 *      stock), it skips uploads entirely — the save is effectively instant.
 *   4. Submits via fetch and follows the server redirect.
 *
 * If this script fails to load, the form still works via the classic multipart
 * fallback on the server (upload_files_parallel) — nothing breaks.
 */
(function () {
    'use strict';

    // --- Client-Side Image Compression ---
    function compressImage(file, max_width = 1200, max_height = 1200, quality = 0.8) {
        if (!file.type.startsWith('image/')) return Promise.resolve(file);
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    let width = img.width;
                    let height = img.height;
                    if (width > max_width || height > max_height) {
                        if (width > height) {
                            height = Math.round((height * max_width) / width);
                            width = max_width;
                        } else {
                            width = Math.round((width * max_height) / height);
                            height = max_height;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    }, 'image/jpeg', quality);
                };
                img.onerror = function() {
                    resolve(file);
                };
                img.src = e.target.result;
            };
            reader.onerror = function() {
                resolve(file);
            };
            reader.readAsDataURL(file);
        });
    }

    function init() {
        const form = document.getElementById('productForm') || document.getElementById('product-form');
        if (!form) return;

        let busy = false;

        form.addEventListener('submit', function (e) {
            if (busy) { e.preventDefault(); return; }
            e.preventDefault();
            busy = true;
            save().catch(function (err) {
                console.error('[product-form] save failed:', err);
                busy = false;
                hideOverlay();
                alert('Could not upload images: ' + (err && err.message ? err.message : err) +
                      '\n\nNothing was saved — please try again.');
            });
        });

        async function save() {
            showOverlay();
            const items = collectFiles();

            if (items.length > 0) {
                setStatus('Compressing and preparing secure upload…');
                const sign = await fetch('/admin/cloudinary-sign', {
                    headers: { 'Accept': 'application/json' }
                }).then(function (r) {
                    if (!r.ok) throw new Error('Upload signature request failed (HTTP ' + r.status + ')');
                    return r.json();
                });
                if (!sign || !sign.signature) throw new Error(sign && sign.message ? sign.message : 'Cloudinary is not configured on the server');

                let completed = 0;
                const results = await Promise.all(items.map(async function (item) {
                    let fileToUpload = item.file;
                    if (fileToUpload.type.startsWith('image/')) {
                        try {
                            fileToUpload = await compressImage(fileToUpload);
                        } catch (compErr) {
                            console.error('Compression failed for', fileToUpload.name, compErr);
                        }
                    }
                    const url = await uploadOne(sign, fileToUpload);
                    completed += 1;
                    setProgress(Math.round((completed / items.length) * 100));
                    setStatus('Uploading images to Cloudinary… ' + completed + ' / ' + items.length);
                    return { key: item.key, url: url };
                }));
                buildHiddenInputs(Object.fromEntries(results.map(function (r) { return [r.key, r.url]; })));
                // IMPORTANT: clear the file inputs so the final form POST does NOT
                // carry the raw megabytes to Flask a second time.
                items.forEach(function (it) { if (it.input) it.input.value = ''; });
            } else {
                // FAST PATH: no new images — nothing to upload at all.
                buildHiddenInputs({});
            }

            if (new URLSearchParams(location.search).has('profile')) addHidden('profile', '1');

            setStatus('Saving product…');
            const formData = new FormData(form);
            formData.delete('img_primary');
            formData.delete('size_chart');
            formData.delete('product_images[]');
            formData.delete('var_img[]');

            const res = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                redirect: 'follow'
            });

            if (res.redirected) { window.location.href = res.url; return; }
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                const data = await res.json();
                if (data.redirect) { window.location.href = data.redirect; return; }
                throw new Error(data.message || 'Save failed');
            }
            // Fallback: swap in the returned HTML (e.g. validation page)
            document.open();
            document.write(await res.text());
            document.close();
        }

        function collectFiles() {
            const items = [];
            const p = form.querySelector('input[name="img_primary"]');
            if (p && p.files && p.files[0]) items.push({ key: 'img_primary', file: p.files[0], input: p });
            const sc = form.querySelector('input[name="size_chart"]');
            if (sc && sc.files && sc.files[0]) items.push({ key: 'size_chart', file: sc.files[0], input: sc });

            let gi = 0; // gallery files flattened (supports multiple="multiple")
            form.querySelectorAll('input[name="product_images[]"]').forEach(function (el) {
                Array.prototype.forEach.call(el.files || [], function (f) {
                    items.push({ key: 'gallery_' + (gi++), file: f, input: el });
                });
            });

            form.querySelectorAll('input[name="var_img[]"]').forEach(function (el, i) {
                if (el.files && el.files[0]) items.push({ key: 'var_' + i, file: el.files[0], input: el });
            });
            return items;
        }

        async function uploadOne(sign, file) {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('api_key', sign.api_key);
            fd.append('timestamp', sign.timestamp);
            fd.append('folder', sign.folder);
            fd.append('transformation', sign.transformation); // resize/compress on Cloudinary, free
            fd.append('signature', sign.signature);
            const res = await fetch('https://api.cloudinary.com/v1_1/' + sign.cloud_name + '/image/upload', {
                method: 'POST', body: fd
            });
            const data = await res.json().catch(function () { return null; });
            if (!res.ok || !data || !data.secure_url) {
                throw new Error((data && data.error && data.error.message) || ('Cloudinary upload failed (HTTP ' + res.status + ')'));
            }
            return data.secure_url;
        }

        function buildHiddenInputs(map) {
            setHidden('img_primary_url', map['img_primary'] || '');
            setHidden('size_chart_url', map['size_chart'] || '');
            const gal = [];
            let idx = 0;
            while (map['gallery_' + idx]) { gal.push(map['gallery_' + idx]); idx += 1; }
            setHidden('gallery_urls', JSON.stringify(gal));
            // One hidden var_img_url[] per variation row, aligned by index with
            // var_name[]/var_price[]/var_stock[] ('' = keep the existing image).
            form.querySelectorAll('input[name="var_img[]"]').forEach(function (el, i) {
                addHidden('var_img_url[]', map['var_' + i] || '');
            });
        }

        function setHidden(name, value) {
            let el = form.querySelector('input[type="hidden"][name="' + name + '"]');
            if (!el) { el = document.createElement('input'); el.type = 'hidden'; el.name = name; form.appendChild(el); }
            el.value = value;
        }

        function addHidden(name, value) {
            const el = document.createElement('input');
            el.type = 'hidden'; el.name = name; el.value = value;
            form.appendChild(el);
        }

        // ---- lightweight progress overlay (self-contained, no CSS file needed) ----
        let overlay = null, statusEl = null, barEl = null;

        function showOverlay() {
            if (overlay) return;
            overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;';
            const card = document.createElement('div');
            card.style.cssText = 'background:#fff;border-radius:12px;padding:22px 26px;min-width:300px;box-shadow:0 20px 50px rgba(0,0,0,.25);font-family:inherit;';
            statusEl = document.createElement('div');
            statusEl.style.cssText = 'font-size:14px;font-weight:600;color:#333;margin-bottom:12px;';
            statusEl.textContent = 'Working…';
            const track = document.createElement('div');
            track.style.cssText = 'height:8px;background:#eee;border-radius:99px;overflow:hidden;';
            barEl = document.createElement('div');
            barEl.style.cssText = 'height:100%;width:0%;background:#7c3aed;transition:width .15s ease;';
            track.appendChild(barEl);
            card.appendChild(statusEl);
            card.appendChild(track);
            overlay.appendChild(card);
            document.body.appendChild(overlay);
        }
        function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }
        function setProgress(p) { if (barEl) barEl.style.width = p + '%'; }
        function hideOverlay() { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay = null; }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
