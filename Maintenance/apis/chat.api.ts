import axiosService from "@/services/axiosConfig";

export interface SendChatRequestBody {
  customerId: string;
  content: string;
  attachment?: string | null;
}

export interface PaginatedMessagesResponse<TMessage = any> {
  success: boolean;
  message?: string;
  data?: {
    conversation?: any;
    messages?: TMessage[];
    pagination?: {
      currentPage: number;
      limit: number;
      totalMessages: number;
      totalPages: number;
      hasMoreMessages: boolean;
    };
  };
}

export interface SendMessageResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export async function sendMessage(body: SendChatRequestBody) {
  const res = await axiosService.post<SendMessageResponse>("/chat/send", body);
  return res.data;
}

export async function getConversation(
  conversationId: string,
  params?: { page?: number; limit?: number }
) {
  const res = await axiosService.get<PaginatedMessagesResponse>(
    `/chat/${conversationId}`,
    { params }
  );
  return res.data;
}

export interface WaitingResponse<TMessage = any> {
  success: boolean;
  message?: string;
  data?: {
    conversation?: any;
    messages?: TMessage[];
  };
}

// Long-polling endpoint to wait for new messages
export async function waitForMessages() {
  const res = await axiosService.get<WaitingResponse>("/chat/waiting", { timeout: 60000 });
  return res.data;
}


