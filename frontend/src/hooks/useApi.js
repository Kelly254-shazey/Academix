import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosConfig';

export function useApiQuery(key, url, opts = {}) {
  return useQuery([key], async () => {
    const res = await api.get(url);
    return res.data;
  }, opts);
}

export function useApiMutation(url, method = 'post', opts = {}) {
  const qc = useQueryClient();
  return useMutation(async (payload) => {
    const res = await api[method](url, payload);
    return res.data;
  }, {
    onSuccess: (...args) => {
      if (opts.onSuccess) opts.onSuccess(...args);
      qc.invalidateQueries();
    },
    ...opts,
  });
}

export default useApiQuery;
