const trimTrailingSlash = (url) => String(url || '').replace(/\/+$/, '');

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
);

export const SOCKET_URL = trimTrailingSlash(
  import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'
);

const isAbsoluteUrl = (url = '') => /^https?:\/\//i.test(url);

export const buildBackendFileUrl = (url = '') => {
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || isAbsoluteUrl(url)) {
    return url;
  }

  if (url.startsWith('/uploads')) {
    return `${SOCKET_URL}${url}`;
  }

  return url.startsWith('/') ? `${SOCKET_URL}${url}` : url;
};

export const buildImportedMediaUrl = (src = '') => {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src;

  try {
    const url = new URL(src, SOCKET_URL);

    if (url.pathname.startsWith('/uploads/imported-media/')) {
      return `${API_BASE_URL}/media/imported/${url.pathname.slice('/uploads/imported-media/'.length)}`;
    }

    if (url.pathname.startsWith('/api/media/imported/')) {
      return `${API_BASE_URL}/media/imported/${url.pathname.slice('/api/media/imported/'.length)}`;
    }

    return buildBackendFileUrl(src);
  } catch {
    return buildBackendFileUrl(src);
  }
};

export const isImportedMediaUrl = (src = '') => {
  try {
    const url = new URL(src, SOCKET_URL);
    return url.pathname.startsWith('/api/media/imported/')
      || url.pathname.startsWith('/uploads/imported-media/');
  } catch {
    return false;
  }
};
