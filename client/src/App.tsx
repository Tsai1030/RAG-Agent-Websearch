import React, { useState, useRef, useEffect } from 'react';
import { Heart, Brain, Search as SearchIcon, User, Send } from 'lucide-react';
import QueryForm from './components/QueryForm';
import QueryResult from './components/QueryResult';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import { queryMedicalInfo } from './services/api';
import { QueryResponse, QueryStatus, QueryHistory } from './types';
import ChatBubble from './components/ChatBubble';
import AILoadingDots from './components/AILoadingDots';

function App() {
  const [status, setStatus] = useState<QueryStatus>('idle');
  const [history, setHistory] = useState<QueryHistory[]>([]);
  const [error, setError] = useState<string>('');
  const [pendingAI, setPendingAI] = useState(false);
  const [pendingUserMsg, setPendingUserMsg] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 統一最大寬度
  const CHAT_WIDTH = 'max-w-[800px]';

  const handleQuery = async (query: string) => {
    setPendingUserMsg(query);
    setPendingAI(true);
    setStatus('loading');
    setError('');
    try {
      const response = await queryMedicalInfo(query, history);
      setHistory(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          query,
          response: response.response,
          timestamp: response.timestamp,
          status: 'success',
        }
      ]);
      setStatus('success');
    } catch (err: any) {
      setError(err.message || '查詢失敗，請稍後再試');
      setStatus('error');
    } finally {
      setPendingAI(false);
      setPendingUserMsg(null);
    }
  };

  const handleRetry = () => {
    if (history.length > 0) {
      handleQuery(history[history.length - 1].query);
    }
  };

  // 自動滾動到底部
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [history, pendingUserMsg, pendingAI]);

  // 只顯示 user query 與 AI 最終答案，不顯示 ReAct 推理過程
  const chatMessages = [
    ...history.map(item => [
      { id: item.id + '-q', role: 'user', content: item.query },
      { id: item.id + '-a', role: 'assistant', content: item.response || '' }
    ]).flat(),
    // 只在尚未送出時顯示暫存 user 訊息
    ...(pendingUserMsg && history.length === 0 ? [{ id: 'pending-user', role: 'user', content: pendingUserMsg }] : [])
  ];

  const MessageBubble = ({ message }: { message: any }) => {
    const isUser = message.role === 'user';
    return (
      <div className={`group mb-6 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`w-full ${CHAT_WIDTH}`}>
          {/* User Label */}
          {isUser && (
            <div className="flex items-center gap-2 mb-2 justify-end">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">你</span>
            </div>
          )}
          {/* Assistant Label */}
          {!isUser && (
            <div className="flex items-center gap-2 mb-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold">AI</span>
              </div>
              <span className="text-sm font-medium text-gray-700">醫療助理</span>
            </div>
          )}
          {/* Message Content */}
          <div className={`relative ml-8 ${isUser ? 'flex justify-end' : 'flex justify-start'}`}>
            <div className="prose prose-sm max-w-full text-gray-800 leading-relaxed whitespace-pre-wrap bg-white rounded-xl px-4 py-2 shadow border border-gray-100" style={{wordBreak: 'break-word'}}>
              {message.content}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TypingIndicator = () => (
    <div className="group mb-6 mr-12">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
          <span className="text-white font-bold">AI</span>
        </div>
        <span className="text-sm font-medium text-gray-700">醫療助理</span>
      </div>
      <div className="ml-8">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );

  const hasMessages = history.length > 0 || !!pendingUserMsg;

  return (
    <div className="min-h-screen bg-white">
      {/* 頁首 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Heart className="h-8 w-8 text-medical-600" />
                <Brain className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  即時醫療資訊查詢系統
                </h1>
                <p className="text-sm text-gray-600">
                  結合 Google 搜尋 + GPT-4o 的智慧查詢
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <SearchIcon className="h-4 w-4" />
              <span>Powered by Serper API + OpenAI</span>
            </div>
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <main className="flex-1 flex flex-col bg-white">
        {hasMessages ? (
          <>
            {/* 訊息串 */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto flex flex-col items-center pb-32">
              <div className={`w-full ${CHAT_WIDTH} px-2 py-6`}>
                {chatMessages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {pendingAI && <TypingIndicator />}
              </div>
            </div>
            {/* 輸入框固定底部 */}
            <div className="fixed bottom-0 left-0 w-full z-20 bg-white flex justify-center border-t border-gray-200 py-4">
              <div className={`w-full ${CHAT_WIDTH}`}>
                <div className="relative">
                  <textarea
                    value={pendingUserMsg || ''}
                    onChange={e => setPendingUserMsg(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (pendingUserMsg && pendingUserMsg.trim()) handleQuery(pendingUserMsg);
                      }
                    }}
                    placeholder="請輸入您的醫療問題..."
                    className="w-full resize-none rounded-2xl border border-gray-300 px-4 py-3 pr-12 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-colors"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                    disabled={pendingAI}
                  />
                  <button
                    onClick={() => { if (pendingUserMsg && pendingUserMsg.trim()) handleQuery(pendingUserMsg); }}
                    disabled={!pendingUserMsg || !pendingUserMsg.trim() || pendingAI}
                    className={`absolute right-2 top-2 p-2 rounded-xl transition-all ${
                      pendingUserMsg && pendingUserMsg.trim() && !pendingAI
                        ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Send size={16} />
                  </button>
                </div>
                <div className="text-xs text-gray-500 text-center mt-2">
                  本系統結合 Google 搜尋與 GPT-4o，提供即時醫療資訊查詢。<br />
                  回覆僅供參考，請勿作為正式醫療診斷依據。<br />
                </div>
              </div>
            </div>
          </>
        ) : (
          // 初始置中（真正垂直水平置中）
          <div className="flex min-h-screen items-center justify-center bg-white">
            <div className={`w-full ${CHAT_WIDTH}`}>
              <div className="relative">
                <textarea
                  value={pendingUserMsg || ''}
                  onChange={e => setPendingUserMsg(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (pendingUserMsg && pendingUserMsg.trim()) handleQuery(pendingUserMsg);
                    }
                  }}
                  placeholder="請輸入您的醫療問題..."
                  className="w-full resize-none rounded-2xl border border-gray-300 px-4 py-3 pr-12 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-colors"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                  disabled={pendingAI}
                />
                <button
                  onClick={() => { if (pendingUserMsg && pendingUserMsg.trim()) handleQuery(pendingUserMsg); }}
                  disabled={!pendingUserMsg || !pendingUserMsg.trim() || pendingAI}
                  className={`absolute right-2 top-2 p-2 rounded-xl transition-all ${
                    pendingUserMsg && pendingUserMsg.trim() && !pendingAI
                      ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={16} />
                </button>
              </div>
              <div className="text-xs text-gray-500 text-center mt-2">
                本系統結合 Google 搜尋與 GPT-4o，提供即時醫療資訊查詢。<br />
                回覆僅供參考，請勿作為正式醫療診斷依據。<br />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App; 