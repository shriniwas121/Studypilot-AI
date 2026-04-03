"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";


type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  originalContent?: string;
  sourceType?: "document" | "external" | "none";
};

type LibraryItem = {
  id: string;
  name: string;
  type: "PDF" | "TXT" | "SAS" | "VIDEO" | "WEB" | "WORD";
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
  const [showScreenshotPasteBox, setShowScreenshotPasteBox] = useState(false);  
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
  const askIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ RESTORE LIBRARY ON PAGE LOAD
  useEffect(() => {
    try {
      const savedLibrary = localStorage.getItem("docpilot_library");
      const savedActiveId = localStorage.getItem("docpilot_active_id");
  
      if (!savedLibrary) return;
  
      const parsed: LibraryItem[] = JSON.parse(savedLibrary);
  
      if (!parsed.length) return;
  
      setLibrary(parsed);
  
      // const activeItem =
      //   parsed.find(i => i.id === savedActiveId) || parsed[0];
	  // 
      // setActiveId(activeItem.id);
      // setFileName(activeItem.name);
      // setSummary(activeItem.summary);
      // setDocumentText(activeItem.documentText);

      setActiveId("");
      setFileName("");
      setSummary("");
      setDocumentText("");
      setQuestion("");
      setAnswer("");
      setStreamingText("");
      setActiveTab("chat");
      setTabContent("");
      setTranslatedTabContent("");
      setQuizData([]);
      setQuizAnswers({});
      setQuizScore(null);
      setCurrentQ(0);
      setSelectedLanguage("english");
      localStorage.removeItem("docpilot_active_id");



  
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
      const items = e.clipboardData?.items;
      if (!items) return;
  
      for (const item of items) {
        if (item.type.includes("image")) {
          if (activeId) {
            alert("You are already inside a document. Click New Chat before using screenshot.");
            return;
          }
  
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
  
          break;
        }
      }
    };
  
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [API, activeId]);



  const cleanContent = useMemo(() => {
    return (translatedTabContent || tabContent || "").replace(/\n/g, "\n\n");
  }, [translatedTabContent, tabContent]);


  useEffect(() => {
    if (activeTab !== "chat") return;
  
    const el = chatEndRef.current;
    if (!el) return;
  
    el.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [streamingText, library, generalChat, activeId, activeTab]);


  // ==================== ALL YOUR FUNCTIONS GO HERE ====================
  // Please paste all your functions (handleFileUpload, handleAsk, handleTabClick, etc.) here
  // For now, I'm showing the structure. You must add them back.

  // Example placeholder (replace with your actual functions):

  const preventNewSourceWhileInDoc = () => {
    if (!activeId) return false;
  
    alert("You are already inside a document. Click New Chat before uploading, pasting, URL, or screenshot.");
    return true;
  };

  const handleUploadButtonClick = () => {
    if (activeId) {
      alert("Click New Chat before uploading another file.");
      return;
    }
  
    document.getElementById("fileUpload")?.click();
  };

  const handleFileUpload = async (e: any) => {
    try {

      if (preventNewSourceWhileInDoc()) return;


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


  const handleUrlAnalyze = async (incomingUrl?: string) => {
    try {

      if (preventNewSourceWhileInDoc()) return;


      const finalUrl = (incomingUrl || urlInput).trim();
      if (!finalUrl) return;
  
      setIsUploading(true);
      setAnswer("");
      setQuestion("");
  
      const formData = new FormData();
  
      let endpoint = "";
      let type: LibraryItem["type"] = "WEB";
  
      if (finalUrl.includes("youtube.com") || finalUrl.includes("youtu.be")) {
        formData.append("video_url", finalUrl);
        endpoint = `${API}/summarize-video`;
        type = "VIDEO";
      } else {
        formData.append("website_url", finalUrl);
        endpoint = `${API}/summarize-website`;
        type = "WEB";
      }
  
      console.log("Calling URL endpoint:", endpoint, "finalUrl:", finalUrl);
  
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
  
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
  
      clearTimeout(timeoutId);
  
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
  
      const data = await res.json();
      console.log("URL API response:", data);
  
      if (!data || (!data.summary && !data.document_text && !data.text && !data.transcript && !data.content)) {
        throw new Error("Empty URL response");
      }
  
      const safeSummary =
        data.summary ||
        data.document_text ||
        data.text ||
        data.transcript ||
        data.content ||
        "No summary available";
  
      const safeText =
        data.document_text ||
        data.text ||
        data.transcript ||
        data.content ||
        "";
  
      setSummary(safeSummary);
      setFileName(data.filename || finalUrl);
      setDocumentText(safeText);
  
      const newItem: LibraryItem = {
        id: crypto.randomUUID(),
        name: finalUrl,
        type,
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
      setActiveTab("chat");
      setTabContent("");
      setTranslatedTabContent("");
      setQuizData([]);
      setQuizAnswers({});
      setQuizScore(null);
      setCurrentQ(0);
      setSelectedLanguage("english");  
      setQuestion("");
      setAnswer("");
      setStreamingText("");
      setUrlInput("");
  
      console.log("URL item created:", newItem);
    } catch (err: any) {
      console.error("handleUrlAnalyze failed:", err);
  
      if (err?.name === "AbortError") {
        setSummary("URL request timed out. Backend URL analysis is hanging.");
      } else {
        setSummary("URL analysis failed. Check backend terminal.");
      }
  
      setQuestion("");
      setAnswer("");
      setStreamingText("");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasteAnalyze = async (inputText?: string) => {

    if (preventNewSourceWhileInDoc()) return;


    const text = inputText || pastedText;
    if (!text.trim()) return;
  
    try {
      setIsUploading(true);
  
      const formData = new FormData();
      formData.append("text", text);
  
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
        documentText: text,
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

      if (preventNewSourceWhileInDoc()) return;

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


  const handleStopAnswer = () => {
    if (askIntervalRef.current) {
      clearInterval(askIntervalRef.current);
      askIntervalRef.current = null;
    }
  
    setIsStreaming(false);
    setIsAsking(false);
  };

  const handleAsk = async () => {
    try {


      console.log("ASK MODE:", activeId ? "DOCUMENT" : "GENERAL");
      
  
      if (!question.trim() || isAsking) return;
  
      // ✅ URL DETECTION
      const trimmed = question.trim();
      
      if (
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://") ||
        trimmed.startsWith("www.")
      ) {
        const detectedUrl = trimmed.startsWith("www.") ? `https://${trimmed}` : trimmed;
        console.log("URL detected:", detectedUrl);
        setUrlInput(detectedUrl);
        setQuestion("");
        await handleUrlAnalyze(detectedUrl);
        return;
      }


      setIsAsking(true);
  
      const userQuestion = question;


      if (!activeId) {
        return;
      }
  
      const activeItem = activeId
        ? library.find((item) => item.id === activeId)
        : null;
      
      const isGeneralChat = !activeId;
      
      if (!isGeneralChat && activeTab !== "chat" && activeTab !== "practice") {
        alert("Questions are only supported in Chat and Practice tabs.");
        return;
      }

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


      
      const docText = isGeneralChat
        ? ""
        : activeTab === "practice"
        ? tabContent || activeItem?.documentText || ""
        : activeItem?.documentText || "";
  
      if (activeTab === "practice") {
        setActiveTab("chat");
      }


      const chatHistoryText = isGeneralChat
        ? ""
        : activeItem?.chatHistory
            ?.slice(-6)
            .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
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
  
      askIntervalRef.current = setInterval(() => {
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

          if (askIntervalRef.current) {
            clearInterval(askIntervalRef.current);
            askIntervalRef.current = null;
          }
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

      let content = data.result || data.summary || "";
      

      if (tab === "practice") {
        let qNum = 0;
      
        content = content
          .split("\n")
          .map((line: string) => {
            const trimmed = line.trim();
      
            if (!trimmed) return line;
      
            const isQuestionLine =
              /^\*\*[^*\n]+:\*\*/.test(trimmed) || /^[A-Za-z][A-Za-z\s\-&()]+:/.test(trimmed);
      
            const isSectionHeading =
              /^conceptual questions:?$/i.test(trimmed) ||
              /^application questions:?$/i.test(trimmed) ||
              /^practice questions:?$/i.test(trimmed);
      
            if (isQuestionLine && !isSectionHeading) {
              qNum += 1;
              return `Q${qNum}. ${line}`;
            }
      
            return line;
          })
          .join("\n");
      }



      if (tab === "mock") {
        const questions = content.split(/\n(?=Question:)/);
      
        const parsed = questions.map((block: string) => {
          const lines = block.split("\n").map((l: string) => l.trim()).filter(Boolean);
      
          const questionLine = lines.find((l) => l.toLowerCase().startsWith("question:")) || "";
          const question = questionLine.replace(/^question:\s*/i, "").trim();
      
          const rawOptions = lines
            .filter((l) => /^[A-D][\).]\s/.test(l))
            .map((l) => ({
              text: l.replace(/^[A-D][\).]\s*/, "").trim(),
            }))
            .slice(0, 4);
      
          const correctOptionTextLine = lines.find((l) =>
            l.toLowerCase().startsWith("correctoptiontext:")
          );
      
          const correctOptionText = correctOptionTextLine
            ? correctOptionTextLine.replace(/correctoptiontext:\s*/i, "").trim()
            : "";
      
          const explanationLine = lines.find((l) =>
            l.toLowerCase().startsWith("explanation:")
          );
      
          const explanation = explanationLine
            ? explanationLine.replace(/explanation:\s*/i, "").trim()
            : "";
      
          if (!question || !correctOptionText || rawOptions.length !== 4) {
            return null;
          }
      
          const correctOptionExists = rawOptions.some(
            (o) => o.text.trim().toLowerCase() === correctOptionText.trim().toLowerCase()
          );
      
          if (!correctOptionExists) {
            return null;
          }
      
          const shuffled = [...rawOptions]
            .map((o) => ({ ...o, sortKey: Math.random() }))
            .sort((a, b) => a.sortKey - b.sortKey)
            .map(({ sortKey, ...rest }) => rest);
      
          const options = shuffled.map((o) => o.text);
      
          const newAnswerIndex = shuffled.findIndex(
            (o) => o.text.trim().toLowerCase() === correctOptionText.trim().toLowerCase()
          );
      
          if (newAnswerIndex < 0) {
            return null;
          }
      
          const newAnswer = ["A", "B", "C", "D"][newAnswerIndex];
      
          return {
            question,
            options,
            answer: newAnswer,
            explanation,
          };
        });
      
        const cleaned = parsed.filter(
          (q: any) => q && q.question && q.options && q.options.length === 4 && q.answer
        );
      
        console.log("QUIZ DATA:", cleaned);
      
        setQuizData(cleaned);
        setQuizAnswers({});
        setQuizScore(null);
        setCurrentQ(0);
        setSelectedLanguage("english");
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
      <div className="flex h-screen flex-col overflow-hidden bg-white text-slate-900 md:flex-row">
  
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
          <div className="border-b border-slate-200 px-5 py-5 bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-500 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-white/30 to-white/10 text-lg font-bold backdrop-blur shadow-[0_8px_20px_rgba(0,0,0,0.18)] ring-1 ring-white/20">
                E
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">ExamLift AI</h1>
                <p className="mt-1 text-sm text-white/85">
                  Grounded exam prep from your real study materials
                </p>
              </div>
            </div>
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

                <div
                  key={item.id}
                  className={`rounded-2xl border p-3 transition ${
                    activeId === item.id
                      ? "border-sky-300 bg-gradient-to-br from-cyan-50 to-teal-50 ring-2 ring-sky-100 shadow-[0_10px_30px_rgba(99,102,241,0.18)]"
                      : "border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:bg-slate-50 hover:-translate-y-0.5"
                  }`}
                >

                  <button
                    onClick={() => {
                      setActiveId(item.id);
                      setActiveTab("chat");
                      setTabContent("");
                      setTranslatedTabContent("");
                      setQuizData([]);
                      setQuizAnswers({});
                      setQuizScore(null);
                      setCurrentQ(0);
                      setSelectedLanguage("english");                  
                      const selectedItem = library.find((libItem) => libItem.id === item.id);
                      if (selectedItem) {
                        setFileName(selectedItem.name);
                        setSummary(selectedItem.summary);
                        setDocumentText(selectedItem.documentText);
                        setQuestion("");
                        setAnswer("");
                        setStreamingText("");
                      }
                    }}
                    className="w-full text-left"
                  >

                    <p className="text-sm font-semibold truncate text-slate-900">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.type} • {item.status}
                    </p>
                  </button>
                
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={() => handleRenameItem(item.id)}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-xs font-medium text-rose-600 hover:underline"
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
              className="md:hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
            >
              ☰
            </button>
          
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white text-lg font-bold shadow-sm">
                  E
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    ExamLift AI
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Grounded Q&A from your study material, with smart external guidance for related questions beyond the document.
                  </p>
                </div>
              </div>
            </div>
          </div>


          <div className="mb-3 flex gap-2 rounded-2xl bg-white/70 p-2 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-200 backdrop-blur">
            {["chat", "summary", "concepts", "practice", "mock"].map((tab) => {
              const isDisabled = !activeId && tab !== "chat";
          
              return (
                <button
                  key={tab}
                  onClick={() => !isDisabled && handleTabClick(tab)}
                  disabled={isDisabled}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-semibold tracking-[0.02em] transition-all duration-200 ${
                    activeTab === tab
                      ? "bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-500 text-white shadow-[0_12px_28px_rgba(99,102,241,0.34)] ring-1 ring-white/20"
                      : "bg-transparent text-slate-600 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 hover:shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
                  } ${isDisabled ? "cursor-not-allowed opacity-40" : ""}`}
                  
                >
                  {tab.toUpperCase()}
                </button>
              );
            })}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2 pt-2 md:px-4 md:pb-4 md:pt-3">
                                
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">


              {activeId && (
                <div className="grid grid-cols-1 gap-2 border-b border-slate-200/80 px-3 py-2 md:grid-cols-[1fr_auto_1fr] md:items-center md:px-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-slate-900">
                      {activeTab === "summary"
                        ? "Smart Summary"
                        : activeTab === "concepts"
                        ? "Key Concepts"
                        : activeTab === "practice"
                        ? "Practice Questions"
                        : activeTab === "mock"
                        ? "Mock Test"
                        : "Chat with content"}
                    </h3>
              
                    <p className="truncate text-xs text-slate-500">
                      {fileName || "Selected content"}
                    </p>

                  </div>
              
                  <div className="flex flex-wrap items-center justify-center gap-2 md:justify-self-center">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm"
                    >
                      <option value="english">English</option>
                      <option value="hindi">Hindi</option>
                      <option value="telugu">Telugu</option>
                      <option value="french">French</option>
                      <option value="german">German</option>
                    </select>
              
                    <button
                      onClick={async () => {
                        let textToUse = "";
              


                        if (activeTab === "chat") {
                          const activeItem = library.find((item) => item.id === activeId);
                          const lastAssistantIndex =
                            activeItem?.chatHistory
                              ?.map((msg, idx) => ({ ...msg, idx }))
                              .filter((msg) => msg.role === "assistant" && msg.content?.trim())
                              .slice(-1)[0]?.idx;
                        
                          if (lastAssistantIndex === undefined) return;
                        
                          const lastAssistantMessage = activeItem?.chatHistory?.[lastAssistantIndex];
                          if (!lastAssistantMessage) return;
                        
                          const originalText =
                            lastAssistantMessage.originalContent || lastAssistantMessage.content;
                        
                          if (!originalText.trim()) return;
                        

                          if (selectedLanguage === "english") {
                            setLibrary((prev) =>
                              prev.map((item) =>
                                item.id === activeId
                                  ? {
                                      ...item,
                                      chatHistory: item.chatHistory.map((msg, idx) =>
                                        idx === lastAssistantIndex
                                          ? {
                                              ...msg,
                                              content: msg.originalContent || msg.content,
                                            }
                                          : msg
                                      ),
                                    }
                                  : item
                              )
                            );
                          
                            if (streamingText) {
                              setStreamingText(originalText);
                            }
                          
                            return;
                          }


                          const formData = new FormData();
                          formData.append("text", originalText);
                          formData.append("language", selectedLanguage);
                        
                          const res = await fetch(`${API}/translate`, {
                            method: "POST",
                            body: formData,
                          });
                        
                          const data = await res.json();
                          const translatedText = data.translated_text || originalText;
                        
                          setLibrary((prev) =>
                            prev.map((item) =>
                              item.id === activeId
                                ? {
                                    ...item,
                                    chatHistory: item.chatHistory.map((msg, idx) =>
                                      idx === lastAssistantIndex
                                        ? {
                                            ...msg,
                                            originalContent: msg.originalContent || originalText,
                                            content: translatedText,
                                          }
                                        : msg
                                    ),
                                  }
                                : item
                            )
                          );


              
                          if (streamingText) {
                            const activeItem = library.find((item) => item.id === activeId);
                            const lastAssistantMessage =
                              [...(activeItem?.chatHistory || [])]
                                .reverse()
                                .find((msg) => msg.role === "assistant" && msg.content?.trim());
                          
                            const originalText =
                              lastAssistantMessage?.originalContent || lastAssistantMessage?.content || streamingText;
                          
                            setStreamingText(selectedLanguage === "english" ? originalText : translatedText);
                          }
              
                          return;
                        }
              
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
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      🌍 Translate
                    </button>
              
                    {activeTab !== "chat" && (
                      isTabSpeaking ? (
                        <button
                          onClick={() => {
                            if (tabAudio) {
                              tabAudio.pause();
                              tabAudio.currentTime = 0;
                            }
                            setTabAudio(null);
                            setIsTabSpeaking(false);
                          }}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 shadow-sm transition hover:bg-rose-100"
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
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                          {isAudioLoading ? "⏳ Processing..." : "🔊 Listen"}
                        </button>
                      )
                    )}
                  </div>


                  <div className="flex flex-wrap items-center justify-start gap-2 md:justify-self-end">
                    {activeTab === "chat" && (
                      <>
                        <span className="rounded-full bg-gradient-to-r from-emerald-50 to-cyan-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                          Grounded Q&A
                        </span>
                  
                        <button
                          onClick={() => handleCopyChat()}
                          disabled={!activeId}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Copy chat
                        </button>
                  
                        <button
                          onClick={() => handleClearChat()}
                          disabled={!activeId}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Clear chat
                        </button>
                      </>
                    )}              

                  </div>


                </div>
              )}




              <div className={`flex h-full flex-1 flex-col min-h-0 overflow-hidden ${activeId ? "p-4 md:p-5" : "p-0"}`}>
                {activeTab !== "chat" ? (
                  <div className="flex-1 h-full min-h-0 overflow-y-auto rounded-[28px] bg-slate-50 p-0 ring-1 ring-slate-200">
                    {isTabLoading ? (


                      <div className="flex h-full items-center justify-center">
                        <div className="rounded-[28px] border border-slate-200 bg-white px-8 py-6 text-center shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                          <div className="mx-auto mb-3 h-10 w-10 animate-pulse rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500" />
                          <p className="text-sm font-medium text-slate-700">Preparing your {activeTab} view...</p>
                          <p className="mt-1 text-xs text-slate-500">ExamLift AI is organizing the content</p>
                        </div>
                      </div>


                    ) : (

                      <div className="space-y-1 p-1 md:p-1">

                        {activeTab === "mock" ? (
                          <div className="space-y-1">


                            <div className="rounded-[6px] border border-indigo-100 bg-gradient-to-br from-cyan-50 via-white to-teal-50 p-0.2 shadow-[0_1px_8px_rgba(99,102,241,0.08)] ring-1 ring-white/70">
                              <div className="flex flex-col gap-1.5 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                            
                                  <h4 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900 md:text-xl">
                                    Question {currentQ + 1}
                                  </h4>
                            
                                  <p className="mt-1 text-xs text-slate-600">
                                    {Object.keys(quizAnswers).length} of {quizData.length} answered
                                  </p>
                                </div>
                            
                                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                                  <div className="rounded-xl bg-white/90 px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                      Progress
                                    </p>
                                    <p className="mt-0.5 text-base font-bold text-slate-900">
                                      {quizData.length ? Math.round(((currentQ + 1) / quizData.length) * 100) : 0}%
                                    </p>
                                  </div>
                            
                                  <div className="rounded-xl bg-white/90 px-3 py-2 shadow-sm ring-1 ring-slate-200">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                      Answered
                                    </p>
                                    <p className="mt-0.5 text-base font-bold text-slate-900">
                                      {Object.keys(quizAnswers).length}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            
                              <div className="mt-2.5">
                                <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-500">
                                  <span>Test progress</span>
                                  <span>
                                    {currentQ + 1} / {quizData.length || 0}
                                  </span>
                                </div>
                            
                                <div className="h-2 w-full overflow-hidden rounded-full bg-white/80 ring-1 ring-slate-200">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-500 transition-all duration-500"
                                    style={{
                                      width: `${quizData.length ? ((currentQ + 1) / quizData.length) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>


                        
                            {quizData.length > 0 && (() => {
                              const q = quizData[currentQ] || {};
                        
                              return (
                                <>
                                  <div className="rounded-[22px] border border-slate-200 bg-white/95 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] ring-1 ring-white/60 backdrop-blur">
                                    <div className="mb-5 flex flex-wrap items-center gap-3">
                        
                                      {quizAnswers[currentQ] && (
                                        <div className="rounded-full bg-slate-100 px-1 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                                          Selected: {quizAnswers[currentQ]}
                                        </div>
                                      )}
                        
                                      {quizScore !== null && (
                                        <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                          Review Mode
                                        </div>
                                      )}
                                    </div>
                        
                                    <p className="mb-5 text-lg font-semibold leading-7 text-slate-900 whitespace-pre-line md:text-xl">
                                      {translatedTabContent || q.question}
                                    </p>
                        
                                    <div className="space-y-2">
                                      {(q.options || []).map((opt: string, i: number) => {
                                        const optionLetter = ["A", "B", "C", "D"][i];
                                        const selected = quizAnswers[currentQ] === optionLetter;
                                        const correct = quizScore !== null && q.answer === optionLetter;
                                        const wrongSelected =
                                          quizScore !== null && selected && q.answer !== optionLetter;
                        
                                        const stateClass =
                                          correct
                                            ? "border-emerald-400 bg-gradient-to-r from-emerald-50 to-white text-emerald-900 shadow-[0_8px_24px_rgba(16,185,129,0.10)]"
                                            : wrongSelected
                                            ? "border-rose-400 bg-gradient-to-r from-rose-50 to-white text-rose-900 shadow-[0_8px_24px_rgba(244,63,94,0.10)]"
                                            : selected
                                            ? "border-indigo-400 bg-gradient-to-r from-cyan-50 to-teal-50 text-slate-900 shadow-[0_10px_26px_rgba(99,102,241,0.12)]"
                                            : "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-slate-50 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]";
                        
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
                                            className={`group w-full rounded-3xl border px-4 py-4 text-left transition duration-200 ${stateClass}`}
                                          >
                                            <div className="flex items-start gap-4">
                                              <span
                                                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ring-1 transition ${
                                                  correct
                                                    ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                                                    : wrongSelected
                                                    ? "bg-rose-100 text-rose-700 ring-rose-200"
                                                    : selected
                                                    ? "bg-indigo-100 text-indigo-700 ring-indigo-200"
                                                    : "bg-slate-100 text-slate-700 ring-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-700 group-hover:ring-indigo-200"
                                                }`}
                                              >
                                                {optionLetter}
                                              </span>
                        
                                              <div className="flex-1">
                                                <p className="text-sm font-medium leading-6">{opt}</p>
                                              </div>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                        
                                    {quizScore !== null && (
                                      <div className="mt-4 rounded-[18px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-inner">
                                        <div className="flex flex-wrap items-center gap-3">
                                          <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                                            Answer Review
                                          </div>
                                          <p className="text-sm font-semibold text-slate-700">
                                            Correct Answer: {q.answer}
                                          </p>
                                        </div>
                        
                                        {q.explanation && (
                                          <p className="mt-2 text-sm leading-6 text-slate-600">
                                            {q.explanation}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                        
                                  <div className="grid gap-2 xl:grid-cols-[1fr_auto]">
                                    <div className="flex flex-wrap items-center gap-1">
                                      <button
                                        disabled={currentQ === 0}
                                        onClick={() => setCurrentQ((prev) => prev - 1)}
                                        className="rounded-1xl border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        ← Previous
                                      </button>
                        
                                      <button
                                        disabled={currentQ === quizData.length - 1}
                                        onClick={() => setCurrentQ((prev) => prev + 1)}
                                        className="rounded-1xl border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        Next →
                                      </button>
                        
                                      <button
                                        onClick={() => {
                                          setQuizAnswers({});
                                          setQuizScore(null);
                                          setCurrentQ(0);
                                          setSelectedLanguage("english");
                                        }}
                                        className="rounded-1xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                                      >
                                        ↺ Restart Test
                                      </button>
                                    </div>
                        
                                    <button
                                      onClick={() => {
                                        let score = 0;
                                        quizData.forEach((item: any, idx: number) => {
                                          if (quizAnswers[idx] === item.answer) score++;
                                        });
                                        setQuizScore(score);
                                      }}
                                      className="rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(99,102,241,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(99,102,241,0.30)]"
                                    >
                                      Submit Test
                                    </button>
                                  </div>
                        
                                  <div className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
                                    <div className="mb-2 flex items-center justify-between">
                                      <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                          Quick Navigation
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-600">
                                          Jump to any question
                                        </p>
                                      </div>
                                    </div>
                        
                                    <div className="flex flex-wrap gap-1">
                                      {quizData.map((_: any, idx: number) => {
                                        const isCurrent = idx === currentQ;
                                        const isAnswered = quizAnswers[idx];
                                        return (
                                          <button
                                            key={idx}
                                            onClick={() => setCurrentQ(idx)}
                                            className={`h-9 w-9 rounded-2xl text-sm font-semibold transition ${
                                              isCurrent
                                                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-[0_10px_24px_rgba(99,102,241,0.28)]"
                                                : isAnswered
                                                ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-100"
                                                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200"
                                            }`}
                                          >
                                            {idx + 1}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                        





                                  {quizScore !== null && (
                                    <div className="rounded-[30px] bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.30)]">
                                      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                        <div>
                                          <p className="text-sm uppercase tracking-[0.22em] text-indigo-200">
                                            Your Result
                                          </p>
                                          <p className="mt-2 text-4xl font-bold tracking-tight">
                                            {quizScore} / {quizData.length}
                                          </p>
                                          <p className="mt-2 text-sm text-slate-300">
                                            {quizData.length
                                              ? `${Math.round((quizScore / quizData.length) * 100)}% score`
                                              : "0% score"}
                                          </p>
                                        </div>
                        
                                        <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur">
                                          <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                                            Status
                                          </p>
                                          <p className="mt-1 text-lg font-semibold text-white">
                                            {quizData.length && quizScore / quizData.length >= 0.8
                                              ? "Excellent"
                                              : quizData.length && quizScore / quizData.length >= 0.6
                                              ? "Good Progress"
                                              : "Keep Practicing"}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : (

                          <div className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-white via-white to-sky-50/40 p-7 shadow-[0_20px_55px_rgba(15,23,42,0.08)] ring-1 ring-white/70 backdrop-blur md:p-8">
                            <div className="mb-5 flex flex-wrap items-center gap-3">
                              <div className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm">
                                {activeTab === "summary"
                                  ? "Smart Summary"
                                  : activeTab === "concepts"
                                  ? "Key Concepts"
                                  : "Practice Questions"}
                              </div>
                          
                              <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                                {fileName || "Selected content"}
                              </div>
                            </div>
                          
                            <div className="prose prose-slate max-w-none prose-headings:tracking-tight prose-headings:text-slate-500 prose-p:text-[12px] prose-p:leading-7 prose-p:text-slate-700 prose-li:text-[12px] prose-li:leading-5 prose-li:text-slate-500 prose-strong:text-slate-500">
                              <ReactMarkdown
                                skipHtml={true}
                                components={{
                                  h1: (props) => (
                                    <h1
                                      className="mb-4 text-2xl font-bold tracking-tight text-slate-900 md:text-2xl"
                                      {...props}
                                    />
                                  ),
                                  h2: (props) => (
                                    <h2
                                      className="mt-4 mb-3 text-1xl font-semibold text-slate-900 md:text-2xl"
                                      {...props}
                                    />
                                  ),
                                  h3: (props) => (
                                    <h3
                                      className="mt-3 text-xl font-bold tracking-tight text-slate-900 md:text-2xl"
                                      {...props}
                                    />
                                  ),
                                  p: (props) => (
                                    <p className="mb-4 text-base leading-8 text-slate-700" {...props} />
                                  ),
                                  ul: (props) => (
                                    <ul className="mb-5 space-y-2 pl-1" {...props} />
                                  ),
                                  li: (props) => (
                                    <li className="mb-4 text-base leading-8 text-slate-700" {...props} />
                                  ),
                                  strong: (props) => (
                                    <strong className="font-semibold text-slate-900" {...props} />
                                  ),
                                  blockquote: (props) => (
                                    <blockquote
                                      className="my-5 rounded-2xl border-l-4 border-indigo-500 bg-indigo-50/70 px-4 py-3 text-slate-700"
                                      {...props}
                                    />
                                  ),
                                }}
                              >
                                {cleanContent}
                              </ReactMarkdown>
                            </div>
                          </div>



                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 h-full min-h-0 overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_24%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.14),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.10),transparent_24%),linear-gradient(135deg,#f7fbff_0%,#eef9ff_34%,#edfdfa_70%,#f7fffd_100%)] p-0 ring-1 ring-sky-100">
                    <div className="h-full">


                      {!activeId && (

                        <div className="w-full">


                          {!activeId && generalChat.length === 0 && (
                            <div className="relative h-full min-h-full w-full overflow-hidden rounded-[32px] border-0 shadow-none">
                              <div className="relative flex h-full min-h-full w-full items-center justify-center overflow-hidden bg-no-repeat">
                                
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.06),transparent_24%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.04),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.03),transparent_24%)]" />
                          
                                <div className="absolute left-[8%] top-[16%] h-24 w-24 rounded-full bg-sky-300/30 blur-3xl md:h-32 md:w-32" />
                                <div className="absolute right-[10%] top-[12%] h-20 w-20 rounded-full bg-cyan-200/40 blur-3xl md:h-28 md:w-28" />
                                <div className="absolute bottom-[12%] left-[18%] h-24 w-24 rounded-full bg-teal-200/35 blur-3xl md:h-32 md:w-32" />
                          
                                <div className="absolute left-[14%] top-[22%] h-1.5 w-1.5 rounded-full bg-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.8)]" />
                                <div className="absolute right-[18%] top-[28%] h-1.5 w-1.5 rounded-full bg-cyan-400/80 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                                <div className="absolute bottom-[24%] right-[28%] h-1.5 w-1.5 rounded-full bg-teal-400/80 shadow-[0_0_12px_rgba(45,212,191,0.8)]" />
                                <div className="absolute bottom-[18%] left-[30%] h-1 w-1 rounded-full bg-sky-500/80 shadow-[0_0_10px_rgba(14,165,233,0.8)]" />
                          
                                <div className="relative z-10 flex h-full min-h-0 w-full items-center justify-center px-4 py-5 md:px-6 md:py-6 lg:px-8">
                                  <div className="ml-[12%] flex max-w-2xl flex-col items-center text-center md:ml-[10%]">
                                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-sky-500/85 via-cyan-500/80 to-teal-500/75 shadow-[0_18px_45px_rgba(14,165,233,0.25)] ring-1 ring-white/20 backdrop-blur">
                                      <span className="text-4xl">📚</span>
                                    </div>
                          
                                    <h1 className="mx-auto max-w-2xl text-[26px] font-bold tracking-tight text-slate-900 md:text-[34px] md:leading-[1.08] lg:text-[40px]">
                                      Welcome to ExamLift AI
                                    </h1>
                          
                                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600 md:text-[15px] md:leading-7">
                                      Your intelligent study companion that turns notes into knowledge.
                                    </p>
                          
                                    <div className="mx-auto mt-5 grid max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
                                      <div className="rounded-[22px] border border-white/15 bg-white/10 px-5 py-5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.16)] backdrop-blur">
                                        <p className="text-sm font-semibold text-black">📝 Smart Summaries</p>
                                      </div>
                                
                                      <div className="rounded-[22px] border border-white/15 bg-white/10 px-5 py-5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.16)] backdrop-blur">
                                        <p className="text-sm font-semibold text-black">🧠 Key Concepts</p>
                                      </div>
                                
                                      <div className="rounded-[22px] border border-white/15 bg-white/10 px-5 py-5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.16)] backdrop-blur">
                                        <p className="text-sm font-semibold text-black">❓ Practice Questions</p>
                                      </div>
                                
                                      <div className="rounded-[22px] border border-white/15 bg-white/10 px-5 py-5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.16)] backdrop-blur">
                                        <p className="text-sm font-semibold text-black">🎯 Mock Tests</p>
                                      </div>

                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}


                        </div>
                      )}


                      {activeId ? (
                        <div className="h-full flex-1 min-h-0 overflow-y-auto rounded-[24px] bg-gradient-to-br from-slate-50 via-white to-sky-50/30 p-3 pr-2 ring-1 ring-slate-200/80 md:p-4">
                          {library
                            .find((item) => item.id === activeId)
                            ?.chatHistory.map((msg, i) => (

                     
                            <div
                              key={i}
                              className={`mb-4 flex items-end gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                            >
                              {msg.role === "assistant" && (
                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-500 text-[11px] font-bold text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)] ring-1 ring-white/20">
                                  AI
                                </div>
                              )}
                      

                              <div className="flex max-w-full flex-col md:max-w-[78%]">
                                <div
                                  className={`rounded-[24px] px-5 py-4 text-[15px] leading-7 shadow-[0_10px_28px_rgba(15,23,42,0.06)] ${
                                    msg.role === "user"
                                      ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white"
                                      : "bg-white/95 text-slate-700 ring-1 ring-slate-200/90 backdrop-blur"
                                  }`}
                                >


                                  <div className="prose prose-slate max-w-none prose-p:my-2 prose-p:text-[15px] prose-p:leading-7 prose-li:text-[15px] prose-li:leading-7 prose-strong:text-inherit prose-headings:text-inherit">
                                    <ReactMarkdown>
                                      {msg.role === "assistant" &&
                                       i === (activeId
                                         ? (library.find(item => item.id === activeId)?.chatHistory?.length ?? 0) - 1
                                         : generalChat.length - 1) &&
                                       isStreaming
                                        ? streamingText
                                        : msg.content}
                                    </ReactMarkdown>
                                  </div>

                      
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
                                      className="mt-3 inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
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
                                      className="mt-3 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600 transition hover:bg-sky-100"
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


                          ))}

                          <div ref={chatEndRef} />
                        </div>

                      ) : (


                        /* ✅ GENERAL CHAT MODE — SAME UI STYLE */


                        <>
                          {/* ✅ GENERAL CHAT HISTORY */}
                          {generalChat.map((msg, i) => (
                            <div
                              key={i}
                              className={`mb-4 flex items-end gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                            >
                              {msg.role === "assistant" && (
                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-500 text-[11px] font-bold text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)] ring-1 ring-white/20">
                                  AI
                                </div>
                              )}
                        
                              <div className="flex max-w-full flex-col md:max-w-[78%]">
                                <div
                                  className={`rounded-[24px] px-5 py-4 text-[15px] leading-7 shadow-[0_10px_28px_rgba(15,23,42,0.06)] ${
                                    msg.role === "user"
                                      ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white"
                                      : "bg-white/95 text-slate-700 ring-1 ring-slate-200/90 backdrop-blur"
                                  }`}
                                >
                                  //<ReactMarkdown>{msg.content}</ReactMarkdown>


                                  <div className="prose prose-slate max-w-none prose-p:my-2 prose-p:text-[15px] prose-p:leading-7 prose-li:text-[15px] prose-li:leading-7 prose-strong:text-inherit prose-headings:text-inherit">
                                    <ReactMarkdown>
                                      {msg.role === "assistant" &&
                                       i === (activeId
                                         ? (library.find(item => item.id === activeId)?.chatHistory?.length ?? 0) - 1
                                         : generalChat.length - 1) &&
                                       isStreaming
                                        ? streamingText
                                        : msg.content}
                                    </ReactMarkdown>
                                  </div>



                        
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
                                        className="mt-3 inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
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
                                        className="mt-3 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600 transition hover:bg-sky-100"
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
                              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-500 text-[11px] font-bold text-white shadow-[0_10px_24px_rgba(14,165,233,0.28)] ring-1 ring-white/20">
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
                                    className="mt-3 inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
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
                                    className="mt-3 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600 transition hover:bg-sky-100"
                                  >
                                    {isAudioLoading ? "⏳ Processing..." : "🔊 Listen"}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                    </div>
                  </div>
                )}


                {/* INPUT AREA - Only in Chat Tab (your original behavior) */}

                {(activeTab === "chat" || activeTab === "practice") && (
                  <div className="mt-2 shrink-0 sticky bottom-0 z-10 rounded-[24px] border border-slate-200 bg-white px-2 py-1 shadow-[0_10px_20px_rgba(15,23,42,0.08)]">
                    <input
                      type="file"
                      id="fileUpload"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                
                    <input
                      type="file"
                      id="cameraUpload"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleCameraUpload}
                    />
                
                    <div className="rounded-[20px] border border-slate-200 bg-white px-3 py-2">
                      <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        disabled={!!activeId && (isAsking || isStreaming)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAsk();
                          }
                        }}
                        rows={2}
                        className="min-h-[44px] w-full resize-none border-0 bg-transparent px-0 py-0 text-[15px] leading-6 text-slate-800 outline-none placeholder:text-slate-400 disabled:text-slate-400 md:min-h-[60px]"


                        placeholder={
                          !!activeId && (isAsking || isStreaming)
                            ? "ExamLift AI is answering... please wait"
                            : !activeId
                            ? "Upload a PDF, Word file, drop a URL, paste a screenshot..."
                            : activeTab === "practice"
                            ? "Ask about these practice questions..."
                            : "Ask about your document..."
                        }

                      />
                
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {!activeId && (
                            <button
                              onClick={handleUploadButtonClick}
                              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-700 transition hover:bg-slate-50 shrink-0"
                              title="Upload file"
                            >
                              +
                            </button>
                          )}
                

                          {activeId && (
                            <button
                              onClick={() => {
                                if (isAsking || isStreaming) return;
                          
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
                                  setQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript));
                                  setIsListening(false);
                                };
                          
                                recognition.onerror = () => {
                                  setIsListening(false);
                                  alert("Mic failed");
                                };
                          
                                recognition.onend = () => setIsListening(false);
                              }}
                              disabled={isAsking || isStreaming}
                              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 shrink-0"
                              title="Voice input"
                            >
                              {isListening ? "🎙️" : "🎤"}
                            </button>
                          )}

                
                          {(isUploading || isAsking) && (
                            <span className="text-sm font-medium text-slate-500">
                              {isUploading ? "Uploading / analyzing..." : "Thinking..."}
                            </span>
                          )}
                        </div>

                        <button
                          className="flex h-10 min-w-[88px] items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
                          disabled={isUploading || (!question.trim() && !(!!activeId && (isAsking || isStreaming)))}
                          onClick={!!activeId && (isAsking || isStreaming) ? handleStopAnswer : handleAsk}
                        >
                          {isUploading ? "Analyzing..." : !!activeId && (isAsking || isStreaming) ? "Stop" : "Send"}
                        </button>
                
                      </div>
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