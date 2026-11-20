import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CarouselData } from '@/components/carousel/types';

interface GenerateCarouselParams {
  topicId?: string;
  generatedContent: string;
  slideCount?: number;
  templateHint?: string;
}

export const useGenerateCarousel = () => {
  return useMutation({
    mutationFn: async ({
      topicId,
      generatedContent,
      slideCount = 6,
      templateHint,
    }: GenerateCarouselParams): Promise<{ jobId: string; status: string }> => {
      const { data } = await api.post('/carousel/generate', {
        topicId,
        generatedContent,
        slideCount,
        templateHint,
      });
      return data;
    },
  });
};

export const useCarouselJob = (jobId: string | null) => {
  return useQuery({
    queryKey: ['carousel-job', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data } = await api.get(`/carousel/jobs/${jobId}`);
      return data;
    },
    enabled: !!jobId,
    // Polling fallback since we are local and not using Supabase Realtime
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'done' || status === 'failed') return false;
      return 2000; // Poll every 2s while processing
    }
  });
};

export const useSaveCarousel = () => {
  return useMutation({
    mutationFn: async ({
      title,
      carousel_data,
      topicId,
    }: {
      title?: string;
      carousel_data: CarouselData;
      topicId?: string;
    }) => {
      const { data } = await api.post('/carousel/save', { title, carousel_data, topicId });
      return data;
    },
  });
};
