import React, { useState } from 'react';
import { Heart, Brain, Search as SearchIcon } from 'lucide-react';
import QueryForm from './components/QueryForm';
import QueryResult from './components/QueryResult';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import { queryMedicalInfo } from './services/api';
import { QueryResponse, QueryStatus, QueryHistory } from './types';

function App() {
  const [status, setStatus] = useState<QueryStatus>('idle');
  const [history, setHistory] = useState<QueryHistory[]>([]);
  const [error, setError] = useState<string>('');

  const handleQuery = async (query: string) => {
    try {
      setStatus('loading');
      setError('');
      // 查詢時傳送歷史
      const response = await queryMedicalInfo(query, history);
      // 新增到歷史
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
    }
  };

  const handleRetry = () => {
    if (history.length > 0) {
      handleQuery(history[history.length - 1].query);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-50 to-blue-50">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* 歡迎訊息 */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              歡迎使用醫療資訊查詢系統
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              輸入您的醫療相關問題，系統將即時搜尋網路資訊並使用 AI 提供自然語言回應
            </p>
          </div>

          {/* 查詢表單 */}
          <QueryForm onSubmit={handleQuery} isLoading={status === 'loading'} />

          {/* 載入狀態 */}
          {status === 'loading' && (
            <LoadingSpinner message="正在搜尋醫療資訊..." />
          )}

          {/* 錯誤訊息 */}
          {status === 'error' && (
            <ErrorMessage error={error} onRetry={handleRetry} />
          )}

          {/* 查詢結果 */}
          {history.length > 0 && (
            <div className="space-y-8">
              {history.map((item) => (
                <QueryResult key={item.id} result={item} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 頁尾 */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              © 2024 即時醫療資訊查詢系統
            </p>
            <p className="text-xs text-gray-500">
              本系統僅供參考，不構成醫療建議。請以醫院官方資訊為準。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App; 