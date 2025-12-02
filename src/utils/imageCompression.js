/**
 * 이미지 압축 및 리사이징 유틸리티
 * HTML5 Canvas를 사용한 클라이언트 측 이미지 최적화
 */

/**
 * 이미지 파일을 압축하고 리사이징
 * @param {File} file - 원본 이미지 파일
 * @param {Object} options - 압축 옵션
 * @param {number} options.maxWidth - 최대 폭 (기본: 1920)
 * @param {number} options.maxHeight - 최대 높이 (기본: 1920)
 * @param {number} options.quality - 압축 품질 0-1 (기본: 0.85)
 * @param {string} options.format - 출력 포맷 'webp' 또는 'jpeg' (기본: 'webp')
 * @returns {Promise<Blob>} 압축된 이미지 Blob
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    format = 'webp'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => reject(new Error('이미지를 로드할 수 없습니다.'));

      img.onload = () => {
        try {
          // 리사이징 계산
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }

          // Canvas 생성 및 그리기
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');

          // 이미지 품질 향상 설정
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(img, 0, 0, width, height);

          // Blob으로 변환
          const mimeType = format === 'webp' && isWebPSupported()
            ? 'image/webp'
            : 'image/jpeg';

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('이미지 압축에 실패했습니다.'));
              }
            },
            mimeType,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 썸네일 생성
 * @param {Blob} blob - 원본 이미지 Blob
 * @param {number} size - 썸네일 크기 (기본: 200)
 * @returns {Promise<Blob>} 썸네일 Blob
 */
export async function createThumbnail(blob, size = 200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('썸네일 생성 실패'));
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 정사각형 썸네일
        canvas.width = size;
        canvas.height = size;

        const scale = Math.max(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        canvas.toBlob(
          (thumbBlob) => {
            URL.revokeObjectURL(url);
            if (thumbBlob) {
              resolve(thumbBlob);
            } else {
              reject(new Error('썸네일 생성 실패'));
            }
          },
          'image/jpeg',
          0.8
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.src = url;
  });
}

/**
 * Blob을 Base64 문자열로 변환
 * @param {Blob} blob 
 * @returns {Promise<string>}
 */
export async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Base64 문자열을 Blob으로 변환
 * @param {string} base64 
 * @returns {Blob}
 */
export function base64ToBlob(base64) {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * WebP 포맷 지원 확인
 * @returns {boolean}
 */
function isWebPSupported() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * 여러 이미지 파일을 한번에 압축 (Progress callback 포함)
 * @param {File[]} files - 이미지 파일 배열
 * @param {Object} options - 압축 옵션
 * @param {Function} onProgress - 진행률 콜백 (current, total)
 * @returns {Promise<Blob[]>}
 */
export async function compressMultipleImages(files, options = {}, onProgress = null) {
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const blob = await compressImage(files[i], options);
    results.push(blob);

    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }

  return results;
}
