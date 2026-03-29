"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sourceType?: "document" | "external" | "none";
};

type LibraryItem = {
  id: string;
  name: string;
  type: "PDF" | "TXT" | "SAS" | "VIDEO" | "WEB";
  status: "Ready" | "Analyzed";
  summary: string;
  documentText: string;
  chatHistory: ChatMessage[];
};

export default function Home() {
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [streamingText, setStreamingText] = useState("");
  const [summary, setSummary] = useState("");
  const [fileName, setFileName] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [chatAudio, setChatAudio] = useState<HTMLAudioElement | null>(null);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [activeTab, setActiveTab] = useState<"chat" | "summary" | "concepts" | "practice" | "mock">("chat");
  const [tabContent, setTabContent] = useState("");
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [tabAudio, setTabAudio] = useState<HTMLAudioElement | null>(null);
  const [isTabSpeaking, setIsTabSpeaking] = useState(false);
  const [translatedTabContent, setTranslatedTabContent] = useState("");
  const [quizData, setQuizData] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [generalChat, setGeneralChat] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  // ✅ RESTORE LIBRARY ON PAGE LOAD
  useEffect(() => {
    try {
      const savedLibrary = localStorage.getItem("docpilot_library");
      const savedActiveId = localStorage.getItem("docpilot_active_id");
  
      if (!savedLibrary) return;
  
      const parsed: LibraryItem[] = JSON.parse(savedLibrary);
  
      if (!parsed.length) return;
  
      setLibrary(parsed);
  
      const activeItem =
        parsed.find(i => i.id === savedActiveId) || parsed[0];
  
      setActiveId(activeItem.id);
      setFileName(activeItem.name);
      setSummary(activeItem.summary);
      setDocumentText(activeItem.documentText);
  
    } catch (err) {
      console.error("Restore failed", err);
    }
  }, []);

  // ✅ SAVE LIBRARY WHEN UPDATED
  useEffect(() => {
    localStorage.setItem("docpilot_library", JSON.stringify(library));
  }, [library]);


  useEffect(() => {
    if (activeId) {
      localStorage.setItem("docpilot_active_id", activeId);
    }
  }, [activeId]);


  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      setIsUploading(true);

      const items = e.clipboardData?.items;
      if (!items) return;
  
      for (const item of items) {
        if (item.type.includes("image")) {
          const blob = item.getAsFile();
          if (!blob) continue;
  
          const formData = new FormData();
          formData.append("file", blob);
  
          setIsUploading(true);
  
          try {
            const res = await fetch(`${API}/ocr`, {
              method: "POST",
              body: formData,
            });
  

            if (!res.ok) {
              const errorText = await res.text();
              throw new Error(errorText);
            }

            const ocrData = await res.json();
            
            const formData2 = new FormData();
            formData2.append("text", ocrData.document_text || ocrData.text || "");
            
            const summaryRes = await fetch(`${API}/summarize-text`, {
              method: "POST",
              body: formData2,
            });
            
            const summaryData = await summaryRes.json();
            
            const safeSummary = summaryData.summary;
            const safeText = ocrData.document_text || ocrData.text || "";

            
            
            const newItem: LibraryItem = {
              id: crypto.randomUUID(),
              name: "Screenshot",
              type: "TXT",
              status: "Analyzed",
              summary: safeSummary,
              documentText: safeText,
              chatHistory: [
                {
                  role: "assistant",
                  content: `Here’s a quick overview:\n\n${safeSummary}`,
                  sourceType: "document",
                },
              ],

            };
  
            setLibrary((prev) => [newItem, ...prev]);
            setActiveId(newItem.id);
            setQuestion("");
            setAnswer("");
            setStreamingText("");

  
          } catch (err) {
            console.error(err);
            alert("Screenshot failed");
          } finally {
            setIsUploading(false);
          }
        }
      }
    };
  

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);


  const cleanContent = useMemo(() => {
    return (translatedTabContent || tabContent || "").replace(/\n/g, "\n\n");
  }, [translatedTabContent, tabContent]);


  // ==================== ALL YOUR FUNCTIONS GO HERE ====================
  // Please paste all your functions (handleFileUpload, handleAsk, handleTabClick, etc.) here
  // For now, I'm showing the structure. You must add them back.

  // Example placeholder (replace with your actual functions):
  const handleFileUpload = async (e: any) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
  
      setIsUploading(true);
  
      const formData = new FormData();
      formData.append("file", file);
  
      const res = await fetch(`${API}/summarize`, {
        method: "POST",
        body: formData,
      });
  
      if (!res.ok) throw new Error("Upload failed");
  
      const data = await res.json();
  
      setFileName(data.filename);
      setDocumentText(data.document_text);
      setSummary(data.summary);
  
      const newItem: LibraryItem = {
        id: crypto.randomUUID(),
        name: data.filename,
        type: "TXT",
        status: "Analyzed",
        summary: data.summary,
        documentText: data.document_text,
        chatHistory: [
          {
            role: "assistant",
            content: `Here’s a quick overview:\n\n${data.summary}`,
            sourceType: "document",
          },
        ],
      };
  
      setLibrary((prev) => [newItem, ...prev]);
      setActiveId(newItem.id);
  
      setQuestion("");
      setStreamingText("");
  
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };


  const handleUrlAnalyze = async () => {
    try {
      if (!urlInput.trim()) return;
  
      setIsUploading(true);
      setAnswer("");
      setQuestion("");
  
      const formData = new FormData();
  
      let endpoint = "";
      let type: LibraryItem["type"] = "WEB";
  
      if (urlInput.includes("youtube.com") || urlInput.includes("youtu.be")) {
        formData.append("video_url", urlInput);
        endpoint = `${API}/summarize-video`;
        type = "VIDEO";
      } else {
        formData.append("website_url", urlInput);
        endpoint = `${API}/summarize-website`;
        type = "WEB";
      }
  

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });
  
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
  
      const data = await res.json();
  
      // ✅ IMPORTANT (keep UI synced)

      const safeSummary =
        data.summary || data.document_text || data.text || "No summary available";
      
      const safeText =
        data.document_text || data.text || "";
      
      setSummary(safeSummary);
      setFileName(data.filename || urlInput);
      setDocumentText(safeText);



      const newItem: LibraryItem = {
        id: crypto.randomUUID(),
        name: urlInput,
        type,
        status: "Analyzed",
        summary: safeSummary,
        documentText: safeText,

        chatHistory: [
          {
            role: "assistant",
            content: `Here’s a quick overview:\n\n${data.summary || data.text}`,
            sourceType: "document",
          },
        ],
      };
  
      setLibrary((prev) => [newItem, ...prev]);
      setActiveId(newItem.id);
      setQuestion("");
      setAnswer("");
      setStreamingText("");

      setUrlInput("");
  
    } catch (err) {
      console.error(err);
      setSummary("URL analysis failed. Check backend terminal.");
    } finally {
      setIsUploading(false);
    }
  };


  const handlePasteAnalyze = async (inputText?: string) => {
    const text = inputText || question;


    if (!pastedText.trim()) return;
  
    try {
      setIsUploading(true);
  
      const formData = new FormData();
      formData.append("text", pastedText);
  
      const res = await fetch(`${API}/summarize-text`, {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
  
      const newItem: LibraryItem = {
        id: crypto.randomUUID(),
        name: "Pasted Text",
        type: "TXT",
        status: "Analyzed",
        summary: data.summary,
        documentText: pastedText,
        chatHistory: [
          {
            role: "assistant",
            content: data.summary,
            sourceType: "document",
          },
        ],
      };
  
      setLibrary(prev => [newItem, ...prev]);
      setActiveId(newItem.id);
  
      setPastedText("");
  
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };


  const handleCameraUpload = async (e: any) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
  
      setIsUploading(true);
  
      const formData = new FormData();
      formData.append("file", file);
  
      const res = await fetch(`${API}/ocr`, {
        method: "POST",
        body: formData,
      });
  

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      const data = await res.json();



      const safeSummary =
        data.summary || data.document_text || data.text || "⚠️ No readable text found. Try clearer image.";
      
      const safeText =
        data.document_text || data.text || "No text found";
      
      setSummary(safeSummary);
      setFileName("Captured Image");
      setDocumentText(safeText);
      
      const newItem: LibraryItem = {
        id: crypto.randomUUID(),
        name: "Captured Image",
        type: "TXT",
        status: "Analyzed",
        summary: safeSummary,
        documentText: safeText,
        chatHistory: [
          {
            role: "assistant",
            content: `Extracted & summarized:\n\n${safeSummary}`,
            sourceType: "document",
          },
        ],
      };

 
      setLibrary((prev) => [newItem, ...prev]);
      setActiveId(newItem.id);
      setQuestion("");
      setAnswer("");
      setStreamingText("");
  
    } catch (err) {
      console.error(err);
      alert("Image processing failed");
    } finally {
      setIsUploading(false);
    }
  };


  const handleAsk = async () => {
    try {
      console.log("ASK MODE:", activeId ? "DOCUMENT" : "GENERAL");
  
      if (!question.trim() || isAsking) return;
  
      // ✅ URL DETECTION
      if (question.includes("http")) {
        setUrlInput(question.trim());
        setQuestion("");
        await handleUrlAnalyze();
        return;
      }
  
      // ✅ LONG TEXT → PASTE ANALYSIS
      if (question.includes("\n") || question.length > 120) {
        const handlePasteAnalyze = async (text: string) => {
        setQuestion("");
        return;
      }
  
      setIsAsking(true);
  
      const userQuestion = question;
  
      // ✅ PUSH USER MESSAGE FIRST
      if (activeId) {
        setLibrary((prev) =>
          prev.map((item) =>
            item.id === activeId
              ? {
                  ...item,
                  chatHistory: [
                    ...item.chatHistory,
                    { role: "user", content: userQuestion },
                    { role: "assistant", content: "" }, // 👈 placeholder
                  ],
                }
              : item
          )
        );
      } else {
        setGeneralChat((prev) => [
          ...prev,
          { role: "user", content: userQuestion },
          { role: "assistant", content: "" }, // 👈 placeholder
        ]);
      }
  
      const activeItem = activeId
        ? library.find((item) => item.id === activeId)
        : null;
  
      const isGeneralChat = !activeId;
  
      const docText = isGeneralChat
        ? ""
        : activeTab === "chat"
        ? activeItem?.documentText || ""
        : tabContent || activeItem?.documentText || "";
  
      const chatHistoryText = isGeneralChat
        ? ""
        : activeItem?.chatHistory
            ?.map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
            .join("\n") || "";
  
      const formData = new FormData();
      formData.append("question", userQuestion);
      formData.append("document_text", docText);
      formData.append("chat_history", chatHistoryText);
  
      const res = await fetch(`${API}/ask`, {
        method: "POST",
        headers: {
          "x-api-key": process.env.NEXT_PUBLIC_API_KEY!,
        },
        body: formData,
      });
  
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
  
      const data = await res.json();
  
      const fullText = data.answer;
      const sourceType = data.source_type || "none";
  
      setStreamingText("");
      setIsStreaming(true);
  
      let i = 0;
  
      const interval = setInterval(() => {
        const partial = fullText.slice(0, i + 1);
  
        if (i < fullText.length) {
          setStreamingText(partial);
  
          // ✅ UPDATE LAST MESSAGE (THIS WAS MISSING)
          if (activeId) {
            setLibrary((prev) =>
              prev.map((item) =>
                item.id === activeId
                  ? {
                      ...item,
                      chatHistory: item.chatHistory.map((msg, idx, arr) =>
                        idx === arr.length - 1
                          ? { ...msg, content: partial, sourceType }
                          : msg
                      ),
                    }
                  : item
              )
            );
          } else {
            setGeneralChat((prev) =>
              prev.map((msg, idx, arr) =>
                idx === arr.length - 1
                  ? { ...msg, content: partial, sourceType: "external" }
                  : msg
              )
            );
          }
  
          i++;
        } else {
          clearInterval(interval);
          setIsStreaming(false);
        }
      }, 20);
  
      setQuestion("");
  
    } catch (err) {
      console.error(err);
      setAnswer("Question failed. Check backend.");
    } finally {
      setIsAsking(false);
    }
  };




  const handleTabClick = async (tab: any) => {
    if (tabAudio) {
      tabAudio.pause();
      tabAudio.currentTime = 0;
      setTabAudio(null);
      setIsTabSpeaking(false);
    }
  
    setTranslatedTabContent("");
    setActiveTab(tab);
  
    if (tab === "chat") return;
  
    const activeItem = library.find(i => i.id === activeId);
    if (!activeItem) return;
  
    setIsTabLoading(true);
    setTabContent("");
  
    const formData = new FormData();
    formData.append("text", activeItem.documentText);
    formData.append("mode", "full");
  
    let endpoint = "";
  
    if (tab === "summary") endpoint = "/summarize-text";
    if (tab === "concepts") endpoint = "/key-concepts";
    if (tab === "practice") endpoint = "/practice-questions";
    if (tab === "mock") endpoint = "/mock-test";
  
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
      const content = data.result || data.summary || "";
  
      if (tab === "mock") {


        const questions = content.split(/\n(?=Question:)/);
        
        const parsed = questions.map((block: string) => {
          const lines = block.split("\n").map((l: string) => l.trim()).filter(Boolean);
        
          const question = lines[0];
        

          const options = lines
            .filter(l => /^[A-D][\).]\s/.test(l))   // only A) B) C) D)
            .map(l => l.replace(/^[A-D][\).]\s*/, ""))
            .slice(0, 4);  // force max 4
        
          const answerLine = lines.find(l =>
            l.toLowerCase().includes("answer")
          );
        
          const answer = answerLine
            ? answerLine.match(/[A-D]/)?.[0] || ""
            : "";


          const explanationLine = lines.find(l =>
            l.toLowerCase().includes("explanation")
          );
          
          const explanation = explanationLine
            ? explanationLine.replace(/explanation[:\-]*/i, "").trim()
            : "";
          
          return { question, options, answer, explanation };


        });
        
        const cleaned = parsed.filter((q: any) => q.options && q.options.length >= 4);

        console.log("QUIZ DATA:", cleaned);

        setQuizData(cleaned);

        setQuizAnswers({});
        setQuizScore(null);
        setCurrentQ(0);
  
      } else {
        setTabContent(content);
      }
  
    } catch (err) {
      console.error(err);
      setTabContent("Failed to load");
    } finally {
      setIsTabLoading(false);
    }
  };


  const handleCopyChat = async () => {
    const activeItem = library.find((item) => item.id === activeId);
    if (!activeItem) return;
  
    const chatText = activeItem.chatHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n\n");
  
    await navigator.clipboard.writeText(chatText);
    alert("Copied!");
  };


  const handleClearChat = () => {
    if (!activeId) return;
  
    const confirmClear = window.confirm("Clear chat for this item?");
    if (!confirmClear) return;
  
    setLibrary((prev) =>
      prev.map((item) =>
        item.id === activeId
          ? { ...item, chatHistory: [] }
          : item
      )
    );
  
    setQuestion("");
    setAnswer("");
  };

  const handleRenameItem = (id: string) => {
    const currentItem = library.find((item) => item.id === id);
    if (!currentItem) return;
  
    const newName = window.prompt("Rename item", currentItem.name);
    if (!newName || !newName.trim()) return;
  
    setLibrary((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, name: newName.trim() }
          : item
      )
    );
  
    // 🔥 important: update header if active
    if (activeId === id) {
      setFileName(newName.trim());
    }
  };

  const handleDeleteItem = (id: string) => {
    const confirmDelete = window.confirm("Remove this item from the library?");
    if (!confirmDelete) return;
  
    const remaining = library.filter((item) => item.id !== id);
    setLibrary(remaining);
  
    // 🔥 handle active item switch
    if (activeId === id) {
      if (remaining.length > 0) {
        const nextItem = remaining[0];
  
        setActiveId(nextItem.id);
        setFileName(nextItem.name);
        setSummary(nextItem.summary);
        setDocumentText(nextItem.documentText);
  
        const lastAssistant = nextItem.chatHistory
          .filter((m) => m.role === "assistant")
          .slice(-1)[0];
  
        setQuestion("");
        setAnswer(lastAssistant?.content || "");
      } else {
        // 🔥 reset everything if no items left
        setActiveId("");
        setFileName("");
        setSummary("");
        setDocumentText("");
        setQuestion("");
        setAnswer("");
        localStorage.removeItem("docpilot_active_id");
      }
    }
  };

  // ... Add all other functions (handleUrlAnalyze, handlePasteAnalyze, etc.)

  // ==================== RETURN STATEMENT (Fixed) ====================

  return (
      <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-100 text-slate-900">
  
        {/* ✅ OVERLAY */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}
  
        {/* ✅ SIDEBAR */}
        <aside
          className={`
            fixed top-0 left-0 z-50 h-full w-80 bg-white border-r border-slate-200
            transform transition-transform duration-300
            ${showSidebar ? "translate-x-0" : "-translate-x-full"}
            md:static md:translate-x-0 md:flex md:flex-col
          `}
        >
          {/* MOBILE HEADER */}
          <div className="flex items-center justify-between px-5 py-4 md:hidden border-b">
            <h1 className="text-lg font-bold">Menu</h1>
            <button onClick={() => setShowSidebar(false)}>✖</button>
          </div>
  
          {/* APP TITLE */}
          <div className="border-b border-slate-200 px-5 py-5">
            <h1 className="text-2xl font-bold tracking-tight">StudyPilot AI</h1>
            <p className="mt-1 text-sm text-slate-500">
              AI-powered study assistant for documents, videos, and voice learning
            </p>
          </div>
  
          {/* LIBRARY */}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <div className="px-3 py-3 border-b">
              <button
                onClick={() => {
                  setActiveId("");
                  setGeneralChat([]);
                  setActiveTab("chat");
                  setFileName("");
                  setSummary("");
                  setDocumentText("");
                  setQuestion("");
                  setAnswer("");
                  setStreamingText("");
                  setTabContent("");
                  setTranslatedTabContent("");
                  setQuizData([]);
                  localStorage.removeItem("docpilot_active_id");
                }}
                className="w-full rounded-xl bg-slate-900 text-white py-2 text-sm font-medium"
              >
                + New Chat
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-500 mb-2">
              Library ({library.length})
            </p>
  
            <div className="space-y-2">
              {library.map((item) => (
                <div key={item.id} className="p-3 border rounded-xl bg-white">
                  <button
                    onClick={() => setActiveId(item.id)}
                    className="w-full text-left"
                  >
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.type} • {item.status}
                    </p>
                  </button>
  
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleRenameItem(item.id)}
                      className="text-xs text-blue-500"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-xs text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
  
        <main className="flex w-full min-w-0 flex-1 flex-col overflow-hidden">
          <div className="border-b border-slate-200 bg-white px-4 md:px-8 py-5 flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(true)}
              className="md:hidden rounded-lg border px-3 py-2 text-sm"
            >
              ☰
            </button>
  
            <div>
              <h2 className="text-xl font-semibold">
                {fileName || "Select or upload a file"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Get a summary and ask grounded questions from the selected content.
              </p>
            </div>
          </div>
  
          <div className="flex gap-2 mb-3">

            {["chat","summary","concepts","practice","mock"].map((tab) => {
              const isDisabled = !activeId && tab !== "chat";
            
              return (
                <button
                  key={tab}
                  onClick={() => !isDisabled && handleTabClick(tab)}
                  disabled={isDisabled}
                  className={`px-3 py-2 text-sm rounded-xl border ${
                    activeTab === tab ? "bg-slate-900 text-white" : "bg-white"
                  } ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  {tab.toUpperCase()}
                </button>
              );
            })}

          </div>
  
          <div className="flex flex-col flex-1 min-h-0 p-2 md:p-4 overflow-hidden">
            <section className="flex flex-col w-full h-full bg-white p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Chat with content</h3>

                  <p className="text-sm text-slate-500">Grounded Q&A for the selected item</p>
                </div>
  
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="rounded-xl border border-slate-300 px-2 py-2 text-xs"
                >
                  <option value="english">English</option>
                  <option value="hindi">Hindi</option>
                  <option value="telugu">Telugu</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                </select>
  
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    Grounded Q&A
                  </span>
  
                  <button
                    onClick={() => handleCopyChat()}
                    disabled={!activeId}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Copy chat
                  </button>
  
                  <button
                    onClick={() => handleClearChat()}
                    disabled={!activeId}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear chat
                  </button>
  
                  <button
                    onClick={() => {
                      setActiveId("");
                      setGeneralChat([]);
                      setActiveTab("chat");
                      setFileName("");
                      setSummary("");
                      setDocumentText("");
                      setQuestion("");
                      setAnswer("");
                      setStreamingText("");
                      setTabContent("");
                      setTranslatedTabContent("");
                      setQuizData([]);
                      localStorage.removeItem("docpilot_active_id");
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    New chat
                  </button>
                </div>
              </div>
  
              <div className="flex flex-1 flex-col min-h-0">
                {activeTab !== "chat" ? (
                  <div className="flex-1 h-full min-h-0 overflow-y-auto rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    {isTabLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-slate-500">Loading...</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <button


                            onClick={async () => {
                              setTranslatedTabContent("");
                              let textToUse = "";
                            
                              if (activeTab === "mock") {
                                const q = quizData[currentQ] || {};
                                textToUse = `${q.question || ""}\n${(q.options || []).join("\n")}`;
                              } else {
                                textToUse = tabContent;
                              }
                            
                              if (!textToUse) return;
                            
                              const formData = new FormData();
                              formData.append("text", textToUse);
                              formData.append("language", selectedLanguage);
                            
                              const res = await fetch(`${API}/translate`, {
                                method: "POST",
                                body: formData,
                              });
                            
                              const data = await res.json();
                            
                              setTranslatedTabContent(data.translated_text || textToUse);
                            }}


                            className="text-xs px-3 py-1 border rounded"
                          >
                            🌍 Translate
                          </button>
  
                          {isTabSpeaking ? (
                            <button
                              onClick={() => {
                                if (tabAudio) {
                                  tabAudio.pause();
                                  tabAudio.currentTime = 0;
                                }
                                setTabAudio(null);
                                setIsTabSpeaking(false);
                              }}
                              className="text-xs px-3 py-1 border rounded text-red-500"
                            >
                              ⏹ Stop
                            </button>
                          ) : (
                            <button

                              onClick={async () => {
                                if (isAudioLoading) return;
                              
                                let textToUse = "";
                              
                                if (activeTab === "mock") {
                                  const q = quizData[currentQ] || {};
                                  textToUse = `${q.question || ""}\n${(q.options || []).join("\n")}`;
                                } else {
                                  textToUse = tabContent;
                                }
                              
                                if (!textToUse) return;
                              
                                setIsAudioLoading(true);
                              
                                try {
                                  if (tabAudio) {
                                    tabAudio.pause();
                                    tabAudio.currentTime = 0;
                                  }
                              
                                  const formData = new FormData();
                                  formData.append("text", textToUse);
                                  formData.append("language", selectedLanguage);
                              
                                  const res = await fetch(`${API}/translate-and-speak`, {
                                    method: "POST",
                                    body: formData,
                                  });
                              
                                  const blob = await res.blob();
                                  const url = URL.createObjectURL(blob);
                                  const audio = new Audio(url);
                              
                                  setTabAudio(audio);
                                  setIsTabSpeaking(true);
                              
                                  await audio.play();
                              
                                  audio.onended = () => {
                                    setTabAudio(null);
                                    setIsTabSpeaking(false);
                                    URL.revokeObjectURL(url);
                                  };
                              
                                } catch (err) {
                                  console.error(err);
                                } finally {
                                  setIsAudioLoading(false);
                                }
                              }}

                              className="text-xs px-3 py-1 border rounded"
                            >
                              {isAudioLoading ? "⏳ Processing..." : "🔊 Listen"}
                            </button>
                          )}
                        </div>
  
                        {activeTab === "mock" ? (
                          <div className="space-y-6">
                            <p className="text-xs text-slate-500 mb-2">
                              {Object.keys(quizAnswers).length} / {quizData.length} answered
                            </p>
                            {quizData.length > 0 && (
                              (() => {
                                const q = quizData[currentQ] || {};
                                return (
                                  <>
                                    <div className="p-4 border rounded-xl bg-white">
                                      <p className="font-semibold mb-2 whitespace-pre-line">
                                        {currentQ + 1}. {translatedTabContent || q.question}
                                      </p>
                                    
                                      <div className="space-y-2">
                                        {q.options.map((opt: string, i: number) => {
                                          const optionLetter = ["A", "B", "C", "D"][i];
                                          const selected = quizAnswers[currentQ];
                                          const correct = q.answer;
                                    
                                          let bg = "bg-white";
                                          if (quizScore !== null) {
                                            if (optionLetter === correct) bg = "bg-green-100";
                                            else if (selected === optionLetter) bg = "bg-red-100";
                                          } else if (selected === optionLetter) {
                                            bg = "bg-blue-100";
                                          }
                                    
                                          return (
                                            <button
                                              key={i}
                                              onClick={() => {
                                                if (quizScore !== null) return;
                                                setQuizAnswers((prev) => ({
                                                  ...prev,
                                                  [currentQ]: optionLetter,
                                                }));
                                              }}
                                              className={`block w-full text-left px-3 py-2 border rounded ${bg}`}
                                            >
                                              {optionLetter}) {opt}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    
                                      {/* ✅ ADD THIS EXACTLY HERE */}
                                      {quizScore !== null && (
                                        <div className="mt-3 text-sm text-slate-600 border-t pt-2">
                                          <strong>Explanation:</strong> {q.explanation || "No explanation provided"}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setCurrentQ(prev => Math.max(prev - 1, 0))}
                                        disabled={currentQ === 0}
                                        className="px-3 py-2 border rounded disabled:opacity-50"
                                      >
                                        Previous
                                      </button>
                                    
                                      <button
                                        onClick={() =>
                                          setCurrentQ(prev => Math.min(prev + 1, quizData.length - 1))
                                        }
                                        disabled={currentQ === quizData.length - 1}
                                        className="px-3 py-2 border rounded disabled:opacity-50"
                                      >
                                        Next
                                      </button>
                                    </div>
  
                                    <button
                                      onClick={() => {
                                        let score = 0;
                                        quizData.forEach((q, idx) => {
                                          if (quizAnswers[idx] === q.answer) score++;
                                        });
                                        setQuizScore(score);
                                      }}
                                      className="px-4 py-2 bg-slate-900 text-white rounded"
                                    >
                                      Submit Test
                                    </button>
                                    <button
                                      onClick={() => {
                                        setQuizAnswers({});
                                        setQuizScore(null);
                                        setCurrentQ(0);
                                        setTranslatedTabContent(""); // reset translation too
                                      }}
                                      className="px-4 py-2 border rounded"
                                    >
                                      🔄 Restart Test
                                    </button>


                                    {quizScore !== null && (
                                      <div className="p-4 rounded-xl bg-slate-100 border">
                                        <p className="text-lg font-semibold">
                                          Score: {quizScore} / {quizData.length}
                                        </p>
                                    
                                        <p className="text-sm mt-1 text-slate-600">
                                          {quizScore === quizData.length
                                            ? "Perfect score 🎯"
                                            : quizScore > quizData.length * 0.7
                                            ? "Good job 👍"
                                            : "Keep practicing 💪"}
                                        </p>
                                      </div>
                                    )}

                                  </>
                                );
                              })()
                            )}
                          </div>
                        ) : (

                          <ReactMarkdown
                            skipHtml={true}
                            components={{
                              h1: (props) => <h1 className="text-xl font-bold mb-3" {...props} />,
                              h2: (props) => <h2 className="text-lg font-semibold mb-2" {...props} />,
                              h3: (props) => <h3 className="text-md font-semibold mb-2" {...props} />,
                              p: (props) => <p className="mb-3 leading-7" {...props} />,
                              li: (props) => <li className="ml-4 list-disc mb-1" {...props} />,
                            }}
                          >
                            {cleanContent}
                          </ReactMarkdown>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 h-full min-h-0 overflow-y-auto rounded-2xl bg-slate-50 p-4 pb-28 ring-1 ring-slate-200">
                    <div className="space-y-4">

                      {!activeId && (

                        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                          <div className="mb-1">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl flex items-center justify-center text-6xl shadow-2xl">
                              📚
                            </div>
                          </div>
        
                          <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome to StudyPilot</h1>
                          <p className="text-xl text-slate-600 mb-5 max-w-md">
                            Your intelligent study companion that turns notes into knowledge
                          </p>
        
                          <div className="grid grid-cols-2 gap-4 mb-10 w-full max-w-xs mx-auto">
                            <div className="bg-white p-4 rounded-2xl border shadow-sm text-sm">📝 Smart Summaries</div>
                            <div className="bg-white p-4 rounded-2xl border shadow-sm text-sm">🧠 Key Concepts</div>
                            <div className="bg-white p-4 rounded-2xl border shadow-sm text-sm">❓ Practice Questions</div>
                            <div className="bg-white p-4 rounded-2xl border shadow-sm text-sm">🎯 Mock Tests</div>
                          </div>
        
                          <button
                            onClick={() => document.getElementById("fileUpload")?.click()}
                            className="w-full max-w-xs bg-slate-900 hover:bg-slate-800 transition-colors text-white font-semibold py-4 px-8 rounded-2xl flex items-center justify-center gap-3 text-lg shadow-lg"
                          >
                            📎 Upload Your Study Material
                          </button>
        
                          <p className="text-xs text-slate-500 mt-6">
                            Supports PDF • Images • Text • URLs • Screenshots
                          </p>
                        </div>

                      )}


                      {activeId ? (
                        library
                          .find((item) => item.id === activeId)
                          ?.chatHistory.map((msg, i) => (
                      
                            <div
                              key={i}
                              className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                            >
                              {msg.role === "assistant" && (
                                <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                                  AI
                                </div>
                              )}
                      
                              <div className="flex flex-col max-w-full md:max-w-[75%]">
                                <div
                                  className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                                    msg.role === "user"
                                      ? "bg-slate-900 text-white"
                                      : "bg-white text-slate-700 ring-1 ring-slate-200"
                                  }`}
                                >


                                  <ReactMarkdown>
                                    {msg.role === "assistant" &&
                                     i === (activeId
                                       ? (library.find(item => item.id === activeId)?.chatHistory?.length ?? 0) - 1
                                       : generalChat.length - 1) &&
                                     isStreaming
                                      ? streamingText
                                      : msg.content}
                                  </ReactMarkdown>


                      
                                  {/* ✅ KEEP YOUR ORIGINAL AUDIO LOGIC EXACTLY */}
                                  {activeAudioId === `${i}` ? (
                                    <button
                                      onClick={() => {
                                        if (chatAudio) {
                                          chatAudio.pause();
                                          chatAudio.currentTime = 0;
                                        }
                                        setChatAudio(null);
                                        setActiveAudioId(null);
                                      }}
                                      className="mt-2 text-xs text-red-500 hover:underline"
                                    >
                                      ⏹ Stop
                                    </button>
                                  ) : (
                                    <button
                                      onClick={async () => {
                                        if (isAudioLoading) return;
                      
                                        if (!msg.content) return;
                      
                                        setIsAudioLoading(true);
                      
                                        try {
                                          if (chatAudio) {
                                            chatAudio.pause();
                                            chatAudio.currentTime = 0;
                                          }
                      
                                          const formData = new FormData();
                                          formData.append("text", msg.content);
                                          formData.append("language", selectedLanguage);
                      
                                          const res = await fetch(`${API}/translate-and-speak`, {
                                            method: "POST",
                                            body: formData,
                                          });
                      
                                          const blob = await res.blob();
                                          const url = URL.createObjectURL(blob);
                                          const audio = new Audio(url);
                      
                                          setChatAudio(audio);
                                          setActiveAudioId(`${i}`);
                      
                                          await audio.play();
                      
                                          audio.onended = () => {
                                            setChatAudio(null);
                                            setActiveAudioId(null);
                                            URL.revokeObjectURL(url);
                                          };
                                        } catch (err) {
                                          console.error(err);
                                        } finally {
                                          setIsAudioLoading(false);
                                        }
                                      }}
                                      className="mt-2 text-xs text-blue-500 hover:underline"
                                    >
                                      {isAudioLoading ? "⏳ Processing..." : "🔊 Listen"}
                                    </button>
                                  )}
                                </div>
                      
                                {msg.role === "assistant" && (
                                  <>
                                    {msg.sourceType === "external" && (
                                      <p className="mt-1 text-xs text-amber-500">🌐 Generated explanation</p>
                                    )}
                                    {msg.sourceType === "document" && (
                                      <p className="mt-1 text-xs text-slate-400">📄 Based on your document</p>
                                    )}
                                    {msg.sourceType === "none" && (
                                      <p className="mt-1 text-xs text-red-400">⚠️ Not related to document</p>
                                    )}
                                  </>
                                )}
                              </div>
                      
                              {msg.role === "user" && (
                                <div className="h-8 w-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold">
                                  You
                                </div>
                              )}
                            </div>
                          ))

                      ) : (
                        /* ✅ GENERAL CHAT MODE — SAME UI STYLE */


                        <>
                          {/* ✅ GENERAL CHAT HISTORY */}
                          {generalChat.map((msg, i) => (
                            <div
                              key={i}
                              className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                            >
                              {msg.role === "assistant" && (
                                <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                                  AI
                                </div>
                              )}
                        
                              <div className="flex flex-col max-w-full md:max-w-[75%]">
                                <div
                                  className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                                    msg.role === "user"
                                      ? "bg-slate-900 text-white"
                                      : "bg-white text-slate-700 ring-1 ring-slate-200"
                                  }`}
                                >


                                  //<ReactMarkdown>{msg.content}</ReactMarkdown>

                                  <ReactMarkdown>
                                    {msg.role === "assistant" &&
                                     i === (activeId
                                       ? (library.find(item => item.id === activeId)?.chatHistory?.length ?? 0) - 1
                                       : generalChat.length - 1) &&
                                     isStreaming
                                      ? streamingText
                                      : msg.content}
                                  </ReactMarkdown>

                        
                                  {/* ✅ SAME AUDIO / STOP / PROCESSING — UNCHANGED */}
                                  {msg.role === "assistant" && (
                                    activeAudioId === `general-${i}` ? (
                                      <button
                                        onClick={() => {
                                          if (chatAudio) {
                                            chatAudio.pause();
                                            chatAudio.currentTime = 0;
                                          }
                                          setChatAudio(null);
                                          setActiveAudioId(null);
                                        }}
                                        className="mt-2 text-xs text-red-500 hover:underline"
                                      >
                                        ⏹ Stop
                                      </button>
                                    ) : (
                                      <button
                                        onClick={async () => {
                                          if (isAudioLoading) return;
                                          if (!msg.content) return;
                        
                                          setIsAudioLoading(true);
                        
                                          try {
                                            if (chatAudio) {
                                              chatAudio.pause();
                                              chatAudio.currentTime = 0;
                                            }
                        
                                            const formData = new FormData();
                                            formData.append("text", msg.content);
                                            formData.append("language", selectedLanguage);
                        
                                            const res = await fetch(`${API}/translate-and-speak`, {
                                              method: "POST",
                                              body: formData,
                                            });
                        
                                            const blob = await res.blob();
                                            const url = URL.createObjectURL(blob);
                                            const audio = new Audio(url);
                        
                                            setChatAudio(audio);
                                            setActiveAudioId(`general-${i}`);
                        
                                            await audio.play();
                        
                                            audio.onended = () => {
                                              setChatAudio(null);
                                              setActiveAudioId(null);
                                              URL.revokeObjectURL(url);
                                            };
                                          } catch (err) {
                                            console.error(err);
                                          } finally {
                                            setIsAudioLoading(false);
                                          }
                                        }}
                                        className="mt-2 text-xs text-blue-500 hover:underline"
                                      >
                                        {isAudioLoading ? "⏳ Processing..." : "🔊 Listen"}
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                        
                              {msg.role === "user" && (
                                <div className="h-8 w-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold">
                                  You
                                </div>
                              )}
                            </div>
                          ))}
                        
                          {/* ✅ STREAMING MESSAGE (KEEP YOUR EXISTING STYLE) */}
                          {streamingText && (
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                                AI
                              </div>
                        
                              <div className="bg-white text-slate-700 ring-1 ring-slate-200 px-4 py-3 rounded-2xl text-sm max-w-[75%]">
                                <ReactMarkdown>{streamingText}</ReactMarkdown>
                        
                                {/* ✅ SAME AUDIO FEATURE */}
                                {activeAudioId === "general-stream" ? (
                                  <button
                                    onClick={() => {
                                      if (chatAudio) {
                                        chatAudio.pause();
                                        chatAudio.currentTime = 0;
                                      }
                                      setChatAudio(null);
                                      setActiveAudioId(null);
                                    }}
                                    className="mt-2 text-xs text-red-500 hover:underline"
                                  >
                                    ⏹ Stop
                                  </button>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      if (isAudioLoading) return;
                        
                                      setIsAudioLoading(true);
                        
                                      try {
                                        if (chatAudio) {
                                          chatAudio.pause();
                                          chatAudio.currentTime = 0;
                                        }
                        
                                        const formData = new FormData();
                                        formData.append("text", streamingText);
                                        formData.append("language", selectedLanguage);
                        
                                        const res = await fetch(`${API}/translate-and-speak`, {
                                          method: "POST",
                                          body: formData,
                                        });
                        
                                        const blob = await res.blob();
                                        const url = URL.createObjectURL(blob);
                                        const audio = new Audio(url);
                        
                                        setChatAudio(audio);
                                        setActiveAudioId("general-stream");
                        
                                        await audio.play();
                        
                                        audio.onended = () => {
                                          setChatAudio(null);
                                          setActiveAudioId(null);
                                          URL.revokeObjectURL(url);
                                        };
                                      } catch (err) {
                                        console.error(err);
                                      } finally {
                                        setIsAudioLoading(false);
                                      }
                                    }}
                                    className="mt-2 text-xs text-blue-500 hover:underline"
                                  >
                                    {isAudioLoading ? "⏳ Processing..." : "🔊 Listen"}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      <div ref={chatEndRef} />
                    </div>
                  </div>
                )}


                {/* INPUT AREA - Only in Chat Tab (your original behavior) */}
                {(activeTab === "chat") && (
                  <div className="mt-4 shrink-0 sticky bottom-0 bg-white pt-2 z-10">
                    <div className="flex items-center gap-2 relative">
                      <input
                        type="file"
                        id="fileUpload"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
  
                      <button
                        onClick={() => document.getElementById("fileUpload")?.click()}
                        className="h-12 w-12 rounded-xl border text-lg shrink-0"
                      >
                        +
                      </button>
  
                      <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAsk();
                          }
                        }}
                        className="h-12 flex-1 rounded-xl border px-4 text-sm"
                        placeholder="Paste text, drop a URL, or even paste a screenshot..."
                      />
  
                      <button
                        className="h-12 rounded-xl bg-slate-900 px-4 text-white shrink-0"
                        disabled={isAsking || isUploading || !question.trim()}
                        onClick={handleAsk}
                      >
                        {isUploading ? "Analyzing..." : isAsking ? "Thinking..." : "Send"}
                      </button>
  
                      <button
                        onClick={() => {
                          const SpeechRecognition =
                            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
                          if (!SpeechRecognition) {
                            alert("Speech recognition not supported in this browser");
                            return;
                          }
  
                          const recognition = new SpeechRecognition();
                          recognition.lang =
                            selectedLanguage === "hindi" ? "hi-IN" :
                            selectedLanguage === "telugu" ? "te-IN" :
                            selectedLanguage === "french" ? "fr-FR" :
                            selectedLanguage === "german" ? "de-DE" : "en-AU";
  
                          recognition.start();
                          setIsListening(true);
  
                          recognition.onresult = (event: any) => {
                            const transcript = event.results[0][0].transcript;
                            setQuestion(transcript);
                            setIsListening(false);
                          };
  
                          recognition.onerror = () => {
                            setIsListening(false);
                            alert("Mic failed");
                          };
  
                          recognition.onend = () => setIsListening(false);
                        }}
                        className="h-12 rounded-xl border px-3 text-xs shrink-0"
                      >
                        {isListening ? "🎙 Listening..." : "🎤"}
                      </button>
                    </div>
                  </div>
                )}





              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }