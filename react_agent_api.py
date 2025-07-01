from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.tools import Tool
from langchain_community.utilities import GoogleSerperAPIWrapper
from langchain.agents import initialize_agent, AgentType
from dotenv import load_dotenv

# 讀取 .env
load_dotenv()

# 1. RAG 設定
embedding_model = HuggingFaceEmbeddings(
    model_name="BAAI/bge-m3",
    model_kwargs={"device": "cpu"}
)
vectorstore = Chroma(
    persist_directory="chroma_db/doctorv4",
    collection_name="doctorv4",
    embedding_function=embedding_model
)
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
llm = ChatOpenAI(model="gpt-4o", temperature=0)
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=retriever
)
def rag_query(query: str) -> str:
    result = qa_chain.invoke({"query": query})
    return result['result'] if isinstance(result, dict) else str(result)
rag_tool = Tool(
    name="本地知識庫查詢",
    func=rag_query,
    description="查詢本地醫師知識庫，適合醫療、醫師、專長等相關問題"
)

# 2. Web Search Tool (Serper)
serper_wrapper = GoogleSerperAPIWrapper()
serper_tool = Tool(
    name="網路搜尋",
    func=serper_wrapper.run,
    description="用於查詢網路最新資訊，使用 Serper API。"
)

def smart_web_search(query: str) -> str:
    try:
        return serper_tool.run(query)
    except Exception as e:
        return f"Web search failed: {e}"

web_search_tool = Tool(
    name="網路搜尋",
    func=smart_web_search,
    description="用於查詢網路最新資訊，使用 Serper API。"
)

# 3. Agent
# 工具順序：RAG、Web Search
tools = [rag_tool, web_search_tool]
agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)

# FastAPI 設定
app = FastAPI()

# 允許所有來源跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/ask")
async def ask_agent(request: Request):
    data = await request.json()
    question = data.get("question", "")
    if not question:
        return {"error": "No question provided"}
    result = agent.run(question)
    return {"result": result}

if __name__ == "__main__":
    uvicorn.run("react_agent_api:app", host="0.0.0.0", port=8000, reload=True) 