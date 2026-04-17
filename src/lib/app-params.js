const isNode = typeof window === 'undefined';

// Safe storage with in-memory fallback when localStorage is unavailable (iOS private mode, etc.)
const createSafeStorage = () => {
  const memoryStore = {};
  
  const isLocalStorageAvailable = () => {
    try {
      const testKey = '__base44_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  };

  const useLocalStorage = !isNode && isLocalStorageAvailable();

  return {
    getItem: (key) => {
      if (useLocalStorage) {
        try { return localStorage.getItem(key); } catch (e) {}
      }
      return memoryStore[key] ?? null;
    },
    setItem: (key, value) => {
      if (useLocalStorage) {
        try { localStorage.setItem(key, value); return; } catch (e) {}
      }
      memoryStore[key] = value;
    },
    removeItem: (key) => {
      if (useLocalStorage) {
        try { localStorage.removeItem(key); return; } catch (e) {}
      }
      delete memoryStore[key];
    }
  };
};

const storage = isNode ? { getItem: () => null, setItem: () => {}, removeItem: () => {} } : createSafeStorage();

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
	}
}


export const appParams = {
	...getAppParams()
}