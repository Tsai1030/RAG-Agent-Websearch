from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA
import os

# 設定 OpenAI API 金鑰
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")# 請填入你的 OpenAI API Key

# 1. 設定 bge-m3 embedding


embedding_model = HuggingFaceEmbeddings(
    model_name="BAAI/bge-m3",
    model_kwargs={"device": "cpu"}
)

vectorstore = Chroma(
    persist_directory="chroma_db",
    collection_name="doctorv4",  # 這裡要和你建立時一致
    embedding_function=embedding_model
)

retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0
)

qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=retriever
)

result = qa_chain.invoke({"query": "請問這個資料庫裡有什麼醫生？"})
print(result)

