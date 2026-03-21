"use client";
import { useEffect, useState, useRef } from "react";
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


  const getSafeData = (data: any, fallbackText = "") => {
    const safeSummary =
      data.summary || data.document_text || data.text || fallbackText || "No summary available";
  
    const safeText =
      data.document_text || data.text || fallbackText || "";
  
    return { safeSummary, safeText };
  };


  const handleAsk = async () => {
    try {

//    if (!question || !documentText || isAsking) return;
      if (!question || isAsking) return;
      
      // ✅ URL detection
      if (question.startsWith("http")) {
        setUrlInput(question);
        setQuestion("");
        await handleUrlAnalyze();
        return;
      }
      
      // ✅ Large pasted text detection
      if (question.length > 200) {
        setPastedText(question);
        setQuestion("");
        await handlePasteAnalyze();
        return;
      }
      
      // ✅ Normal Q&A needs document
      // if (!documentText) {
      //   alert("Please upload or add content first.");
      //   return;
      // }

      const hasDocument = !!documentText;


      setIsAsking(true);
  
      const userQuestion = question;
  
      const activeItem = library.find((item) => item.id === activeId);
  
      const chatHistoryText =
        activeItem?.chatHistory
          ?.map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
          .join("\n") || "";
  
      const formData = new FormData();
      formData.append("question", userQuestion);
      formData.append("document_text", hasDocument ? documentText : "");
      formData.append("chat_history", chatHistoryText);
  

      console.log("Sending request...");
      const res = await fetch("https://studypilot-backend-f5td.onrender.com/ask", {
        method: "POST",
        headers: {
          "x-api-key": "insightxai-10821",
        },
        body: formData,
      });

      console.log("Response status:", res.status);

  
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
  
      const data = await res.json();
  
      const fullText = data.answer;
      const sourceType = data.source_type || "none";
  
      // ✅ RESET BEFORE START
      setStreamingText("");
  
      let i = 0;
  
      const interval = setInterval(() => {
        setStreamingText((prev) => prev + fullText[i]);
        i++;
  
        if (i >= fullText.length) {
          clearInterval(interval);
  
          // ✅ SAVE FINAL MESSAGE
          setLibrary((prev) =>
            prev.map((item) =>
              item.id === activeId
                ? {
                    ...item,
                    chatHistory: [
                      ...item.chatHistory,
                      { role: "user", content: userQuestion },
                      {
                        role: "assistant",
                        content: fullText,
                        sourceType: sourceType,
                      },
                    ],
                  }
                : item
            )
          );
  
          // ✅ CRITICAL FIX (THIS WAS MISSING)
          setStreamingText("");
        }
      }, 15);
 
      setQuestion("");
    } catch (err) {
      console.error(err);
      setAnswer("Question failed. Check backend terminal.");
    } finally {
      setIsAsking(false);
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
        endpoint = "https://studypilot-backend-f5td.onrender.com/summarize-video";
        type = "VIDEO";
      } else {
        formData.append("website_url", urlInput);
        endpoint = "https://studypilot-backend-f5td.onrender.com/summarize-website";
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

  const handlePasteAnalyze = async () => {
    try {
      if (!pastedText.trim()) return;
  
      setIsUploading(true);
  
      const formData = new FormData();
      formData.append("text", pastedText);


      const res = await fetch("https://studypilot-backend-f5td.onrender.com/summarize-text", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      const data = await res.json();  

      
      console.log("API DATA:", data); // 👈 ADD HERE
      
      const { safeSummary, safeText } = getSafeData(data, pastedText);
      
      setSummary(safeSummary);
      setFileName("Pasted Content");
      setDocumentText(safeText);
      
      const newItem: LibraryItem = {
        id: crypto.randomUUID(),
        name: "Pasted Content",
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
      setPastedText("");
  
    } catch (err) {
      console.error(err);
      alert("Text analysis failed");
    } finally {
      setIsUploading(false);
    }
  };
  

  const handleFileUpload = async (e: any) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
  
      setIsUploading(true);
  
      const formData = new FormData();
      formData.append("file", file);
  
      const res = await fetch("https://studypilot-backend-f5td.onrender.com/summarize", {
        method: "POST",
        body: formData,
      });
  
      if (!res.ok) {
        throw new Error("Upload failed");
      }
  
      const data = await res.json();
  
      // ✅ Sync UI
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


  const handleCameraUpload = async (e: any) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
  
      setIsUploading(true);
  
      const formData = new FormData();
      formData.append("file", file);
  
      const res = await fetch("https://studypilot-backend-f5td.onrender.com/ocr", {
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
  
    if (activeId === id) {
      setFileName(newName.trim());
    }
  };
  
  const handleDeleteItem = (id: string) => {
    const confirmDelete = window.confirm("Remove this item from the library?");
    if (!confirmDelete) return;
  
    const remaining = library.filter((item) => item.id !== id);
    setLibrary(remaining);
  
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


  const handleClearChat = () => {
    if (!activeId) return;
  
    const confirmClear = window.confirm("Clear chat for this item?");
    if (!confirmClear) return;
  
    setLibrary((prev) =>
      prev.map((item) =>
        item.id === activeId
          ? {
              ...item,
              chatHistory: [],
            }
          : item
      )
    );
  
    setQuestion("");
    setAnswer("");
  };

  const handleCopySummary = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    alert("Summary copied.");
  };
  
  const handleCopyChat = async () => {
    const activeItem = library.find((item) => item.id === activeId);
    if (!activeItem || activeItem.chatHistory.length === 0) return;
  
    const chatText = activeItem.chatHistory
      .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n\n");
  
    await navigator.clipboard.writeText(chatText);
    alert("Chat copied.");
  };
  
  const handleDownloadTxt = () => {
    const activeItem = library.find((item) => item.id === activeId);
    if (!activeItem) return;
  
    const chatText =
      activeItem.chatHistory.length > 0
        ? activeItem.chatHistory
            .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
            .join("\n\n")
        : "No chat yet.";
  
    const content = `DocPilot AI Export
  ====================
  
  Source:
  ${activeItem.name}
  
  Type:
  ${activeItem.type}
  
  Summary:
  ${activeItem.summary || "No summary available."}
  
  Chat:
  ${chatText}
  `;
  
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
  
    const a = document.createElement("a");
    a.href = url;
    a.download = "docpilot-export.txt";
    a.click();
  
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const savedLibrary = localStorage.getItem("docpilot_library");
    const savedActiveId = localStorage.getItem("docpilot_active_id");

    if (savedLibrary) {
      const parsedLibrary: LibraryItem[] = JSON.parse(savedLibrary);
      setLibrary(parsedLibrary);

    }
  }, []);


  useEffect(() => {
    localStorage.setItem("docpilot_library", JSON.stringify(library));
  }, [library]);


  useEffect(() => {
    if (activeId) {
      localStorage.setItem("docpilot_active_id", activeId);
    }
  }, [activeId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: streamingText ? "smooth" : "auto" });
  }, [
    streamingText,
    library,     // ✅ when chatHistory updates
    activeId     // ✅ when switching item (PDF / YouTube / Web)
  ]);


  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
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
            const res = await fetch("https://studypilot-backend-f5td.onrender.com/ocr", {
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
            setFileName("Screenshot");
            setDocumentText(safeText);
            
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
                  content: `Extracted from screenshot:\n\n${safeSummary}`,
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



  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-100 text-slate-900">
  
      {/* ✅ OVERLAY (OUTSIDE ASIDE) */}


      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        ></div>
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
                setFileName("");
                setSummary("");
                setDocumentText("");
                setQuestion("");
                setAnswer("");
                setStreamingText("");
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
            
                {/* ACTIONS */}
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
          
          {/* MOBILE MENU BUTTON */}
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

        <div className="flex flex-col flex-1 min-h-0 p-4 md:p-6 overflow-hidden">

          <section className="flex flex-col w-full max-w-7xl mx-auto h-full rounded-3xl bg-white p-4 md:p-6 shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Chat with content</h3>
                <p className="text-sm text-slate-500">Grounded Q&A for the selected item</p>
              </div>

              {/* 🌍 LANGUAGE DROPDOWN */}
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
                  onClick={handleCopyChat}
                  disabled={!activeId}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Copy chat
                </button>
              
                <button
                  onClick={handleClearChat}
                  disabled={!activeId}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear chat
                </button>

                <button
                  onClick={() => {
                    setActiveId("");
                    setFileName("");
                    setSummary("");
                    setDocumentText("");
                    setQuestion("");
                    setAnswer("");
                    setStreamingText("");
                    localStorage.removeItem("docpilot_active_id");

                  }}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                >
                  New chat
                </button>


              </div>
            </div>

            <div className="flex flex-1 flex-col min-h-0">

              <div className="flex-1 h-full min-h-0 overflow-y-auto rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">

                <div className="space-y-4">
                
                  {/* ✅ CHAT HISTORY FIRST */}
                  {library
                    .find((item) => item.id === activeId)
                    ?.chatHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 ${
                          msg.role === "user" ? "justify-end" : ""
                        }`}
                      >
                        {/* Avatar (AI) */}
                        {msg.role === "assistant" && (
                          <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                            AI
                          </div>
                        )}
                
                        {/* Message + Source */}
                        <div className="flex flex-col max-w-full md:max-w-[75%]">
                          <div
                            className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                              msg.role === "user"
                                ? "bg-slate-900 text-white"
                                : "bg-white text-slate-700 ring-1 ring-slate-200"
                            }`}
                          >

                            <div>

                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                              {activeAudioId === `${i}` ? (
                                // ⏹ STOP BUTTON
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
                                // 🔊 LISTEN BUTTON
                                <button
                                  onClick={async () => {
                                    if (!msg.content) return;
                              
                                    // 🛑 STOP PREVIOUS AUDIO FIRST
                                    if (chatAudio) {
                                      chatAudio.pause();
                                      chatAudio.currentTime = 0;
                                    }
                              
                                    const formData = new FormData();
                                    formData.append("text", msg.content);
                                    formData.append("language", selectedLanguage);
                              
                                    const res = await fetch("https://studypilot-backend-f5td.onrender.com/translate-and-speak", {
                                      method: "POST",
                                      body: formData,
                                    });
                              
                                    const contentType = res.headers.get("content-type");
                              
                                    if (!res.ok || contentType?.includes("application/json")) {
                                      alert("Speech failed");
                                      return;
                                    }
                              
                                    const blob = await res.blob();
                                    const url = URL.createObjectURL(blob);
                              
                                    const audio = new Audio(url);
                              
                                    setChatAudio(audio);
                                    setActiveAudioId(`${i}`);
                              
                                    audio.play();
                              
                                    audio.onended = () => {
                                      setChatAudio(null);
                                      setActiveAudioId(null);
                                      URL.revokeObjectURL(url);
                                    };
                                  }}
                                  className="mt-2 text-xs text-blue-500 hover:underline"
                                >
                                  🔊 Listen
                                </button>
                              )}

                            </div>
                          </div>
                
                          {/* SOURCE LABEL */}
                          {msg.role === "assistant" && (
                            <>
                              {msg.sourceType === "external" && (
                                <p className="mt-1 text-xs text-amber-500">
                                  🌐 Generated explanation
                                </p>
                              )}
                
                              {msg.sourceType === "document" && (
                                <p className="mt-1 text-xs text-slate-400">
                                  📄 Based on your document
                                </p>
                              )}
                
                              {msg.sourceType === "none" && (
                                <p className="mt-1 text-xs text-red-400">
                                  ⚠️ Not related to document
                                </p>
                              )}
                            </>
                          )}
                        </div>
                
                        {/* User Avatar */}
                        {msg.role === "user" && (
                          <div className="h-8 w-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold">
                            You
                          </div>
                        )}
                      </div>
                    ))}
                
                  {/* ✅ STREAMING MESSAGE LAST (LIKE CHATGPT) */}
                  {streamingText && (
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                        AI
                      </div>
                
                      <div className="max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-6 bg-white text-slate-700 ring-1 ring-slate-200">
                        <ReactMarkdown>{streamingText}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                
                  {/* ✅ AUTO SCROLL */}
                  <div ref={chatEndRef} />
                </div>

              </div>
              <div className="mt-4 shrink-0">

                <div className="flex items-center gap-2 relative">
                
                  {/* ➕ BUTTON */}

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

                
                  {/* INPUT */}
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
                    placeholder="Ask question, paste text, or enter URL..."
                  />
                
                  {/* SEND */}

                  <button
                    className="h-12 rounded-xl bg-slate-900 px-4 text-white shrink-0"
                    disabled={isAsking || isUploading || !question.trim()}
                    onClick={handleAsk}
                  >
                    {isUploading
                      ? "Analyzing..."
                      : isAsking
                      ? "Thinking..."
                      : "Send"}
                  </button>

                
                  {/* SPEAK */}
                  <button
                    onClick={() => { /* keep existing */ }}
                    className="h-12 rounded-xl border px-3 text-xs shrink-0"
                  >
                    {isListening ? "🎙" : "🎤"}
                  </button>
                
                </div>


              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
