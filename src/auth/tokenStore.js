let accessToken = null;

export const setToken = (t) => { accessToken = t || null; };
export const getToken = () => accessToken;
export const clearToken = () => { accessToken = null; };