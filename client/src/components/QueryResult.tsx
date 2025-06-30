import React from 'react';
import { Clock, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { QueryResponse, SearchResult } from '../types';

interface QueryResultProps {
  result: QueryResponse;
}

const QueryResult: React.FC<QueryResultProps> = ({ result }) => {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 查詢結果卡片 */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900">查詢結果</h2>
          </div>
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{formatTimestamp(result.timestamp)}</span>
          </div>
        </div>

        {/* 原始查詢 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">原始查詢：</p>
          <p className="text-gray-900 font-medium">{result.query}</p>
        </div>

        {/* AI 回應 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">🤖 AI 回應：</h3>
          <div className="p-4 bg-medical-50 border border-medical-200 rounded-lg">
            <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
              {result.response}
            </p>
          </div>
        </div>

        {/* 搜尋結果摘要 */}
        {result.searchResults?.organic?.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              🔍 搜尋結果 ({result.searchResults.totalResults} 筆)：
            </h3>
            <div className="space-y-3">
              {result.searchResults.organic.map((item: SearchResult, index: number) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-medical-600 mb-1 line-clamp-2">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                        {item.link}
                      </p>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {item.snippet}
                      </p>
                    </div>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 p-1 text-gray-400 hover:text-medical-600 transition-colors"
                      title="在新視窗開啟"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 注意事項 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800 mb-1">注意事項</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 系統完全依賴網路即時資訊，資訊可能會有延遲</li>
              <li>• 建議直接聯繫醫院確認最新資訊</li>
              <li>• 此系統僅供參考，不構成醫療建議</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueryResult; 