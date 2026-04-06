"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { 
  BookOpen, Upload, Link2, Camera, Mic, Send, X, Menu, Plus, 
  FileText, Video, Globe, Trash2, Pencil, Volume2, VolumeX, 
  ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, XCircle,
  Sparkles, Brain, Target, MessageSquare, GraduationCap, Zap,
  LogIn, Mail, User, Lock, Eye, EyeOff, Loader2, Lightbulb, 
  Award, TrendingUp, Library, Clock
} from "lucide-react";

// Simple cn utility - combines class names
function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

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

// Google Icon Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function Home() {
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [chatLanguage, setChatLanguage] = useState("english");
  const [tabLanguage, setTabLanguage] = useState("english");
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
  const [loadingChatAudioId, setLoadingChatAudioId] = useState<string | null>(null);

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
  const [mockDifficulty, setMockDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [generalChat, setGeneralChat] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const askIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // RESTORE LIBRARY ON PAGE LOAD
  useEffect(() => {
    try {
      const savedLibrary = localStorage.getItem("docpilot_library");
      const savedActiveId = localStorage.getItem("docpilot_active_id");

      if (!savedLibrary) return;

      const parsed: LibraryItem[] = JSON.parse(savedLibrary);

      if (!parsed.length) return;

      setLibrary(parsed);

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
      setChatLanguage("english");
      setTabLanguage("english");
      localStorage.removeItem("docpilot_active_id");

    } catch (err) {
      console.error("Restore failed", err);
    }
  }, []);

  // SAVE LIBRARY WHEN UPDATED
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
                  content: `Here's a quick overview:\n\n${safeSummary}`,
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
            content: `Here's a quick overview:\n\n${data.summary}`,
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
            content: `Here's a quick overview:\n\n${safeSummary}`,
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
      setChatLanguage("english");
      setTabLanguage("english");
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
        data.summary || data.document_text || data.text || "No readable text found. Try clearer image.";

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

      // URL DETECTION
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

      // PUSH USER MESSAGE FIRST
      if (activeId) {
        setLibrary((prev) =>
          prev.map((item) =>
            item.id === activeId
              ? {
                ...item,
                chatHistory: [
                  ...item.chatHistory,
                  { role: "user", content: userQuestion },
                  { role: "assistant", content: "" },
                ],
              }
              : item
          )
        );
      } else {
        setGeneralChat((prev) => [
          ...prev,
          { role: "user", content: userQuestion },
          { role: "assistant", content: "" },
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

          // UPDATE LAST MESSAGE
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


  const handleTabClick = async (
    tab: any,
    selectedDifficulty?: "easy" | "medium" | "hard"
  ) => {

    if (tabAudio) {
      tabAudio.pause();
      tabAudio.currentTime = 0;
      setTabAudio(null);
      setIsTabSpeaking(false);
    }
  
    setTranslatedTabContent("");
    setActiveTab(tab);
  
    if (tab === "chat") return;
  
    const activeItem = library.find((i) => i.id === activeId);
    if (!activeItem) return;
  
    setIsTabLoading(true);
    setTabContent("");
  
    try {
      const formData = new FormData();
      formData.append("text", activeItem.documentText);
      
      if (tab === "mock") {
        formData.append("difficulty", selectedDifficulty || mockDifficulty);
      }

      let endpoint = "";
  
      if (tab === "summary") endpoint = `${API}/summarize-text`;
      if (tab === "concepts") endpoint = `${API}/key-concepts`;
      if (tab === "practice") endpoint = `${API}/practice-questions`;
      if (tab === "mock") endpoint = `${API}/mock-test`;
  
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
      let content = data.result || data.content || data.text || data.summary || "";
  

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


      if (tab === "concepts") {
        const lines = content
          .split("\n")
          .map((line: string) => line.trim())
          .filter(Boolean)
          .map((line: string) => line.replace(/^[-•]\s*/, "").trim());
      
        const formatted: string[] = [];
      
        for (let i = 0; i < lines.length; i += 2) {
          const heading = lines[i];
          const description = lines[i + 1];
      
          if (!heading) continue;
      
          if (formatted.length > 0) {
            formatted.push("");
          }
      
          formatted.push(`**${heading}**`);
          formatted.push("");
      
          if (description) {
            formatted.push(description);
            formatted.push("");
          }
        }
      
        content = formatted.join("\n").replace(/\n{3,}/g, "\n\n").trim();
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
  

          return {
            question,
            options,
            correctAnswer: newAnswerIndex,
            explanation,
          };

        });
  

        const cleaned = parsed.filter(
          (q: any) =>
            q &&
            q.question &&
            q.options &&
            q.options.length === 4 &&
            typeof q.correctAnswer === "number" &&
            q.correctAnswer >= 0 &&
            q.correctAnswer < 4
        );


        setQuizData(cleaned);
        setQuizAnswers({});
        setQuizScore(null);
        setCurrentQ(0);
        setChatLanguage("english");
        setTabContent("");
        setTranslatedTabContent("");

      } else {
        setTabContent(content);
        setQuizData([]);
        setQuizScore(null);
        setCurrentQ(0);
        setQuizAnswers({});
      }
    } catch (err) {
      console.error(err);
      setTabContent("Tab load failed.");
    } finally {
      setIsTabLoading(false);
    }
  };


  const handleLanguageChange = (language: string) => {
    if (activeTab === "chat") {
      setChatLanguage(language);
      return;
    }
  
    if (activeTab === "mock") {
      setTabLanguage("english");
      setTranslatedTabContent("");
      return;
    }
  
    setTabLanguage(language);
  };




  const handleTranslate = async () => {
    try {
      if (activeTab === "chat") {
        const activeItem = library.find((item) => item.id === activeId);
        if (!activeItem) return;
  
        const lastAssistantIndex =
          activeItem.chatHistory
            ?.map((msg, idx) => ({ ...msg, idx }))
            .filter((msg) => msg.role === "assistant" && msg.content?.trim())
            .slice(-1)[0]?.idx;
  
        if (lastAssistantIndex === undefined) return;
  
        const lastAssistantMessage = activeItem.chatHistory[lastAssistantIndex];
        if (!lastAssistantMessage) return;
  
        const originalText =
          lastAssistantMessage.originalContent || lastAssistantMessage.content;
  
        if (!originalText.trim()) return;
  
        if (chatLanguage === "english") {
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
          return;
        }
  
        const formData = new FormData();
        formData.append("text", originalText);
        formData.append("language", chatLanguage);
  
        const res = await fetch(`${API}/translate`, {
          method: "POST",
          body: formData,
        });
  
        const data = await res.json();
        const translatedText =
          data.translated_text || data.translated || originalText;
  
        setLibrary((prev) =>
          prev.map((item) =>
            item.id === activeId
              ? {
                  ...item,
                  chatHistory: item.chatHistory.map((msg, idx) =>
                    idx === lastAssistantIndex
                      ? {
                          ...msg,
                          originalContent: msg.originalContent || msg.content,
                          content: translatedText,
                        }
                      : msg
                  ),
                }
              : item
          )
        );
  
        return;
      }
  

      if (activeTab === "mock") {
        setTranslatedTabContent("");
        setTabLanguage("english");
        return;
      }
      
      const textToTranslate = tabContent;
      
      if (!textToTranslate) return;
      
      if (tabLanguage === "english") {
        setTranslatedTabContent("");
        return;
      }
      
      const formData = new FormData();
      formData.append("text", textToTranslate);
      formData.append("language", tabLanguage);
      
      const res = await fetch(`${API}/translate`, {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      setTranslatedTabContent(data.translated || data.translated_text || textToTranslate);

    } catch (err) {
      console.error(err);
    }
  };


  const handleSpeakTab = async () => {
    if (isTabSpeaking && tabAudio) {
      tabAudio.pause();
      tabAudio.currentTime = 0;
      setTabAudio(null);
      setIsTabSpeaking(false);
      return;
    }
  
    let textToSpeak = "";
  
    if (activeTab === "mock") {
      const q = quizData[currentQ] || {};
      textToSpeak = translatedTabContent || `${q.question || ""}\n${(q.options || []).join("\n")}`;
    } else {
      textToSpeak = translatedTabContent || tabContent;
    }
  
    if (!textToSpeak) return;
  
    setIsAudioLoading(true);
  
    try {
      const formData = new FormData();
      formData.append("text", textToSpeak);
      formData.append("language", tabLanguage);
  
      const res = await fetch(`${API}/speak`, {
        method: "POST",
        body: formData,
      });
  
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const newAudio = new Audio(audioUrl);
  
      newAudio.onended = () => {
        setIsTabSpeaking(false);
        setTabAudio(null);
        URL.revokeObjectURL(audioUrl);
      };
  
      await newAudio.play();
      setTabAudio(newAudio);
      setIsTabSpeaking(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAudioLoading(false);
    }
  };


  const handleSpeakChat = async (idx: number, text: string) => {
    const currentAudioId = `${activeId}-${idx}`;
  
    if (chatAudio) {
      chatAudio.pause();
      chatAudio.currentTime = 0;
      setChatAudio(null);
      setActiveAudioId(null);
    }
  
    if (activeAudioId === currentAudioId) {
      setActiveAudioId(null);
      setLoadingChatAudioId(null);
      return;
    }
  
    setIsLoadingAudio(true);
    setLoadingChatAudioId(currentAudioId);
  
    try {
      const formData = new FormData();
      formData.append("text", text);
      formData.append("language", chatLanguage);
  
      const res = await fetch(`${API}/speak`, {
        method: "POST",
        body: formData,
      });
  
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const newAudio = new Audio(audioUrl);
  
      newAudio.onended = () => {
        setActiveAudioId(null);
        setChatAudio(null);
        setLoadingChatAudioId(null);
        URL.revokeObjectURL(audioUrl);
      };
  
      await newAudio.play();
      setChatAudio(newAudio);
      setActiveAudioId(currentAudioId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAudio(false);
      setLoadingChatAudioId(null);
    }
  };



  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window)) {
      alert("Speech recognition not supported.");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuestion(transcript);
    };

    recognition.start();
  };

  const handleSelectItem = (item: LibraryItem) => {
    setActiveId(item.id);
    setFileName(item.name);
    setSummary(item.summary);
    setDocumentText(item.documentText);
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
    setChatLanguage("english");
    setTabLanguage("english");
    setShowSidebar(false);
  };

  const handleDeleteItem = (id: string) => {
    setLibrary(prev => prev.filter(item => item.id !== id));

    if (activeId === id) {
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
    }
  };

  const handleRename = (id: string) => {
    const newName = prompt("Enter new name:");
    if (!newName) return;
    setLibrary(prev => prev.map(item =>
      item.id === id ? { ...item, name: newName } : item
    ));
  };

  const startNewChat = () => {
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
    setShowSidebar(false);
  };

  const activeItem = library.find(i => i.id === activeId);

  const chatHistory: ChatMessage[] = activeId
    ? activeItem?.chatHistory || []
    : generalChat;

  const handleQuizSubmit = () => {
    let correctCount = 0;

    quizData.forEach((q, i) => {
      const selectedIdx = parseInt(quizAnswers[i] || "-1", 10);
      if (selectedIdx === q.correctAnswer) {
        correctCount++;
      }
    });

    setQuizScore(correctCount);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsAuthLoading(false);
    setShowAuthModal(false);
    setAuthEmail("");
    setAuthPassword("");
    setAuthName("");
  };

  const tabs = [
    { id: "chat" as const, label: "Chat", icon: MessageSquare },
    { id: "summary" as const, label: "Summary", icon: BookOpen },
    { id: "concepts" as const, label: "Concepts", icon: Brain },
    { id: "practice" as const, label: "Practice", icon: Target },
    { id: "mock" as const, label: "Mock Test", icon: Award },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20">
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-blue-600 via-blue-700 to-teal-600 text-white">
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-xl">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-xl font-bold">ExamLift AI</span>
              </div>
              <h2 className="text-2xl font-bold">
                {authMode === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-blue-100 mt-1">
                {authMode === "signin"
                  ? "Sign in to continue your learning journey"
                  : "Join thousands of students learning smarter"}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-8">
              {/* Google Sign In */}
              <button
                onClick={() => {
                  setIsAuthLoading(true);
                  setTimeout(() => {
                    setIsAuthLoading(false);
                    setShowAuthModal(false);
                  }, 1500);
                }}
                disabled={isAuthLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-sm text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === "signup" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-11 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-teal-700 focus:ring-4 focus:ring-blue-500/30 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAuthLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {authMode === "signin" ? "Signing in..." : "Creating account..."}
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      {authMode === "signin" ? "Sign In" : "Create Account"}
                    </>
                  )}
                </button>
              </form>

              {/* Toggle Auth Mode */}
              <p className="text-center text-gray-600 mt-6">
                {authMode === "signin" ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
                  className="text-blue-600 font-semibold hover:text-blue-700"
                >
                  {authMode === "signin" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Menu + Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors lg:hidden"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl shadow-lg shadow-blue-500/25">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-teal-600 bg-clip-text text-transparent">
                    ExamLift AI
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">Intelligent Study Assistant</p>
                </div>
              </div>
            </div>

            {/* Center: Document Name */}
            {activeItem && (
              <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-100 rounded-full">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 max-w-[200px] truncate">
                  {activeItem.name}
                </span>
              </div>
            )}

            {/* Right: Sign In */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-teal-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Overlay */}
        {showSidebar && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:sticky top-16 left-0 z-50 lg:z-30 w-72 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out",
            showSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Library className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">My Library</h2>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Buttons */}
            <div className="p-4 space-y-2">
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-teal-700 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>

              <div className="flex gap-2">

                <button
                  onClick={handleUploadButtonClick}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload</span>
                </button>

                <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:border-teal-300 hover:bg-teal-50 transition-all cursor-pointer">
                  <Camera className="w-4 h-4" />
                  <span className="text-sm">Camera</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraUpload}
                    className="hidden"
                  />
                </label>
              </div>

            </div>

            {/* URL Input */}
            <div className="px-4 pb-4">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste URL..."
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
                <button
                  onClick={() => handleUrlAnalyze()}
                  disabled={isUploading || !urlInput}
                  className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Library List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {library.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 bg-gray-100 rounded-2xl mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No documents yet</p>
                  <p className="text-gray-400 text-xs mt-1">Upload your first study material</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {library.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "group relative p-3 rounded-xl cursor-pointer transition-all duration-200",
                        activeId === item.id
                          ? "bg-gradient-to-r from-blue-50 to-teal-50 border-2 border-blue-200 shadow-sm"
                          : "bg-gray-50 border-2 border-transparent hover:bg-gray-100 hover:border-gray-200"
                      )}
                      onClick={() => handleSelectItem(item)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            activeId === item.id ? "bg-blue-100" : "bg-white"
                          )}
                        >
                          {item.type === "VIDEO" && <Video className="w-4 h-4 text-red-600" />}
                          {item.type === "WEB" && <Globe className="w-4 h-4 text-teal-600" />}
                          {(item.type === "PDF" || item.type === "TXT" || item.type === "WORD" || item.type === "SAS") && (
                            <FileText className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.status}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRename(item.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(item.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 h-[calc(100vh-4rem)] overflow-hidden">
          {!activeId ? (
            /* Empty State / Welcome Screen - Single View Layout */
            <div className="h-full flex flex-col justify-center p-4 md:p-6 lg:p-8 overflow-y-auto">
              <div className="max-w-6xl w-full mx-auto">
                {/* Two Column Layout for Desktop, Stack for Mobile */}
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-center">
                  
                  {/* Left Side - Hero & Upload */}
                  <div className="flex-1 text-center lg:text-left w-full">
                    {/* Hero - Compact */}
                    <div className="mb-4 lg:mb-6">
                      <div className="inline-flex p-2.5 bg-gradient-to-br from-blue-100 via-blue-50 to-teal-100 rounded-2xl shadow-md shadow-blue-500/10 mb-3 lg:mb-4">
                        <div className="p-2.5 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl shadow-lg">
                          <Sparkles className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                        </div>
                      </div>
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 lg:mb-3">
                        Welcome to{" "}
                        <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
                          Examplift AI
                        </span>
                      </h1>
                      <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                        Your intelligent study companion. Upload any document and unlock AI-powered learning tools.
                      </p>
                    </div>

                    {/* Upload Section - Compact */}
                    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all duration-300 p-4 lg:p-6 mb-4 lg:mb-6">
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-100 to-teal-100 rounded-xl shrink-0">
                          <Upload className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            Upload your study material
                          </h3>
                          <p className="text-gray-500 text-sm">PDF, Word, Text, Images, or URL</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={handleUploadButtonClick}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-medium text-sm rounded-xl hover:from-blue-700 hover:to-teal-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200"
                          >
                            <Upload className="w-4 h-4" />
                            Upload
                          </button>
                          <label className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 font-medium text-sm rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-all cursor-pointer">
                            <Camera className="w-4 h-4" />
                            <span className="hidden sm:inline">Camera</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleCameraUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* URL Input - Inline */}
                    <div className="flex items-center gap-2 mb-4 lg:mb-6">
                      <div className="flex-1 relative">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleUrlAnalyze()}
                          placeholder="Paste YouTube or website URL..."
                          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                      </div>
                      <button
                        onClick={() => handleUrlAnalyze()}
                        disabled={!urlInput.trim()}
                        className="px-4 py-2.5 bg-teal-600 text-white font-medium text-sm rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Analyze
                      </button>
                    </div>

                    {/* Trust Badges - Horizontal */}
                    <div className="flex flex-wrap justify-center lg:justify-start gap-4 lg:gap-6">
                      {[
                        { icon: Zap, label: "AI-Powered" },
                        { icon: TrendingUp, label: "Learn Faster" },
                        { icon: Award, label: "Ace Exams" },
                      ].map((stat, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="p-1.5 bg-gray-100 rounded-lg">
                            <stat.icon className="w-4 h-4 text-gray-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{stat.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Side - Feature Cards Grid */}
                  <div className="flex-1 w-full">
                    <div className="grid grid-cols-2 gap-3 lg:gap-4">
                      {[
                        { icon: BookOpen, title: "Smart Summaries", description: "Instant concise summaries", color: "blue" },
                        { icon: Lightbulb, title: "Key Concepts", description: "Extract core ideas", color: "amber" },
                        { icon: Target, title: "Practice", description: "AI-generated questions", color: "teal" },
                        { icon: Award, title: "Mock Tests", description: "Timed assessments", color: "purple" },
                      ].map((feature, index) => (
                        <div
                          key={index}
                          className="group p-4 lg:p-5 bg-white rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300"
                        >
                          <div
                            className={cn(
                              "inline-flex p-2 lg:p-2.5 rounded-lg mb-2 lg:mb-3",
                              feature.color === "blue" && "bg-blue-100 text-blue-600",
                              feature.color === "amber" && "bg-amber-100 text-amber-600",
                              feature.color === "teal" && "bg-teal-100 text-teal-600",
                              feature.color === "purple" && "bg-purple-100 text-purple-600"
                            )}
                          >
                            <feature.icon className="w-4 h-4 lg:w-5 lg:h-5" />
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm lg:text-base mb-1">{feature.title}</h3>
                          <p className="text-xs lg:text-sm text-gray-500">{feature.description}</p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Hint */}
                    <p className="text-xs text-gray-400 mt-3 lg:mt-4 text-center">
                      Tip: You can also paste screenshots (Ctrl+V) or drag and drop files
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Document Loaded - Show Tabs and Content */
            <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
              {/* Tabs */}
              <div className="mb-6">
                <div className="flex overflow-x-auto gap-2 p-1.5 bg-white rounded-2xl shadow-sm border border-gray-100">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200",
                        activeTab === tab.id
                          ? "bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-lg shadow-blue-500/25"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Chat Tab */}
                {activeTab === "chat" && (
                  <div className="flex flex-col h-[calc(100vh-16rem)]">

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={chatLanguage}
                          onChange={(e) => handleLanguageChange(e.target.value)}
                          className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                        >
                          <option value="english">English</option>
                          <option value="hindi">Hindi</option>
                          <option value="french">French</option>
                          <option value="german">German</option>
                          <option value="spanish">Spanish</option>
                          <option value="arabic">Arabic</option>
                          <option value="japanese">Japanese</option>
                          <option value="chinese">chinese</option>
                        </select>
                    
                        <button
                          onClick={handleTranslate}
                          className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                        >
                          Translate
                        </button>
                      </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                      {chatHistory.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12">
                          <div className="p-4 bg-gradient-to-br from-blue-100 to-teal-100 rounded-2xl mb-4">
                            <MessageSquare className="w-8 h-8 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Chat with your document
                          </h3>
                          <p className="text-gray-500 max-w-sm">
                            Ask questions, request explanations, or explore topics from your uploaded material.
                          </p>
                        </div>
                      )}

                      {chatHistory.map((message, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex",
                            message.role === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl",
                              message.role === "user"
                                ? "bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-br-md"
                                : "bg-gray-100 text-gray-900 rounded-bl-md"
                            )}
                          >
                            {message.role === "assistant" ? (
                              <div className="prose prose-sm max-w-none prose-p:my-2 prose-headings:my-2">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            )}

                            {message.role === "assistant" && message.content && (
                              <button
                                onClick={() => handleSpeakChat(index, message.content)}
                                className="mt-2 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >

                                {loadingChatAudioId === `${activeId}-${index}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : activeAudioId === `${activeId}-${index}` ? (
                                  <VolumeX className="w-4 h-4" />
                                ) : (
                                  <Volume2 className="w-4 h-4" />
                                )}

                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Loading Indicator */}
                      {isAsking && (
                        <div className="flex justify-start">
                          <div className="px-4 py-3 bg-gray-100 rounded-2xl rounded-bl-md">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              <span className="text-gray-600 text-sm">Thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="border-t border-gray-100 p-4">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 relative">
                          <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleAsk();
                              }
                            }}
                            placeholder="Ask anything about your document..."
                            className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[52px] max-h-32"
                            rows={1}
                          />
                          <button
                            onClick={handleVoiceInput}
                            className={cn(
                              "absolute right-3 bottom-3 p-1.5 rounded-lg transition-colors",
                              isListening
                                ? "bg-red-100 text-red-600"
                                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            )}
                          >
                            <Mic className="w-5 h-5" />
                          </button>
                        </div>
                        {isStreaming ? (
                          <button
                            onClick={handleStopAnswer}
                            className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={handleAsk}
                            disabled={!question.trim() || isAsking}
                            className="p-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 transition-all"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary Tab */}
                {activeTab === "summary" && (
                  <div className="max-h-[calc(100vh-16rem)] overflow-y-auto p-6">
                    {isTabLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                        <p className="text-gray-600">Generating summary...</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={tabLanguage}
                              onChange={(e) => handleLanguageChange(e.target.value)}
                              className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                            >
                              <option value="english">English</option>
                              <option value="hindi">Hindi</option>
                              <option value="french">French</option>
                              <option value="german">German</option>
                              <option value="spanish">Spanish</option>
                              <option value="arabic">Arabic</option>
                              <option value="japanese">Japanese</option>
                              <option value="chinese">chinese</option>
                            </select>
                        
                            <button
                              onClick={handleTranslate}
                              className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                            >
                              Translate
                            </button>
                          </div>

                          <button
                            onClick={handleSpeakTab}
                            disabled={isAudioLoading}
                            className={cn(
                              "p-2 rounded-xl transition-colors flex items-center gap-2",
                              isAudioLoading
                                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                : isTabSpeaking
                                  ? "bg-blue-100 text-blue-600"
                                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            )}
                          >
                            {isAudioLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Processing...</span>
                              </>
                            ) : isTabSpeaking ? (
                              <VolumeX className="w-5 h-5" />
                            ) : (
                              <Volume2 className="w-5 h-5" />
                            )}
                          </button>
                        
                        </div>

                        <div className="prose prose-sm sm:prose max-w-none leading-7 prose-headings:mb-3 prose-headings:text-gray-900 prose-p:my-3 prose-p:text-gray-700 prose-strong:text-gray-900 prose-strong:font-semibold prose-li:my-1 prose-li:text-gray-700">
                          <ReactMarkdown>{cleanContent}</ReactMarkdown>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Concepts Tab */}
                {activeTab === "concepts" && (
                  <div className="max-h-[calc(100vh-16rem)] overflow-y-auto p-6">
                    {isTabLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                        <p className="text-gray-600">Extracting key concepts...</p>
                      </div>
                    ) : (
                      <>

                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={tabLanguage}
                              onChange={(e) => handleLanguageChange(e.target.value)}
                              className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                            >
                              <option value="english">English</option>
                              <option value="hindi">Hindi</option>
                              <option value="french">French</option>
                              <option value="german">German</option>
                              <option value="spanish">Spanish</option>
                              <option value="arabic">Arabic</option>
                              <option value="japanese">Japanese</option>
                              <option value="chinese">chinese</option>
                            </select>
                        
                            <button
                              onClick={handleTranslate}
                              className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                            >
                              Translate
                            </button>
                          </div>

                          <button
                            onClick={handleSpeakTab}
                            disabled={isAudioLoading}
                            className={cn(
                              "p-2 rounded-xl transition-colors flex items-center gap-2",
                              isAudioLoading
                                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                : isTabSpeaking
                                  ? "bg-blue-100 text-blue-600"
                                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            )}
                          >
                            {isAudioLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Processing...</span>
                              </>
                            ) : isTabSpeaking ? (
                              <VolumeX className="w-5 h-5" />
                            ) : (
                              <Volume2 className="w-5 h-5" />
                            )}
                          </button>

                        </div>
                        <div className="prose prose-sm sm:prose max-w-none leading-7 prose-headings:mb-3 prose-headings:text-gray-900 prose-p:my-3 prose-p:text-gray-700 prose-strong:text-gray-900 prose-strong:font-semibold prose-li:my-1 prose-li:text-gray-700">
                          <ReactMarkdown>{translatedTabContent || tabContent}</ReactMarkdown>
                        </div>
                      </>
                    )}
                  </div>
                )}


                {/* Practice Tab */}
                {activeTab === "practice" && (
                  <div className="flex flex-col h-[calc(100vh-16rem)]">
                    <div className="flex-1 overflow-y-auto p-6">
                      {isTabLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                          <p className="text-gray-600">Creating practice questions...</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <select
                                value={tabLanguage}
                                onChange={(e) => handleLanguageChange(e.target.value)}
                                className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                              >
                                <option value="english">English</option>
                                <option value="hindi">Hindi</option>
                                <option value="french">French</option>
                                <option value="german">German</option>
                                <option value="spanish">Spanish</option>
                                <option value="arabic">Arabic</option>
                                <option value="japanese">Japanese</option>
                                <option value="chinese">chinese</option>
                              </select>
                
                              <button
                                onClick={handleTranslate}
                                className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                              >
                                Translate
                              </button>
                            </div>
                
                            <button
                              onClick={handleSpeakTab}
                              disabled={isAudioLoading}
                              className={cn(
                                "p-2 rounded-xl transition-colors flex items-center gap-2",
                                isAudioLoading
                                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                  : isTabSpeaking
                                    ? "bg-blue-100 text-blue-600"
                                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                              )}
                            >
                              {isAudioLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span className="text-sm">Processing...</span>
                                </>
                              ) : isTabSpeaking ? (
                                <VolumeX className="w-5 h-5" />
                              ) : (
                                <Volume2 className="w-5 h-5" />
                              )}
                            </button>



                          </div>
                
                          <div className="prose prose-sm sm:prose max-w-none leading-7 prose-headings:mb-3 prose-headings:text-gray-900 prose-p:my-3 prose-p:text-gray-700 prose-strong:text-gray-900 prose-strong:font-semibold prose-li:my-1 prose-li:text-gray-700">
                            <ReactMarkdown>{cleanContent}</ReactMarkdown>
                          </div>
                        </>
                      )}
                    </div>
                
                    <div className="border-t border-gray-100 p-4">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 relative">
                          <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleAsk();
                              }
                            }}
                            placeholder="Ask about these practice questions..."
                            className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all min-h-[52px] max-h-32"
                            rows={1}
                          />
                          <button
                            onClick={handleVoiceInput}
                            className={cn(
                              "absolute right-3 bottom-3 p-1.5 rounded-lg transition-colors",
                              isListening
                                ? "bg-red-100 text-red-600"
                                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            )}
                          >
                            <Mic className="w-5 h-5" />
                          </button>
                        </div>
                
                        {isStreaming ? (
                          <button
                            onClick={handleStopAnswer}
                            className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={handleAsk}
                            disabled={!question.trim() || isAsking}
                            className="p-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 transition-all"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}


                {/* Mock Test Tab */}
                {activeTab === "mock" && (
                  <div className="max-h-[calc(100vh-16rem)] overflow-y-auto ...">

                    <div className="flex items-center justify-center gap-2 p-4">
                      {[
                        { value: "easy", label: "Easy" },
                        { value: "medium", label: "Medium" },
                        { value: "hard", label: "Hard" },
                      ].map((level) => (
                        <button
                          key={level.value}
                          onClick={() => {
                            const nextDifficulty = level.value as "easy" | "medium" | "hard";
                            setMockDifficulty(nextDifficulty);
                            setQuizData([]);
                            setQuizAnswers({});
                            setQuizScore(null);
                            setCurrentQ(0);
                            setTranslatedTabContent("");
                            handleTabClick("mock", nextDifficulty);
                          }}
                          className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all",
                            mockDifficulty === level.value
                              ? "bg-gradient-to-r from-blue-600 to-teal-600 text-white border-transparent shadow-md"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                          )}
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>

                    {isTabLoading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                        <p className="text-gray-600">Generating mock test...</p>
                      </div>
                    ) : quizData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="p-4 bg-gradient-to-br from-blue-100 to-teal-100 rounded-2xl mb-4">
                          <Award className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No quiz available</h3>
                        <p className="text-gray-500 mb-6 max-w-sm text-center">
                          Click the Mock Test tab to generate a quiz from your document.
                        </p>
                      </div>
                    ) : quizScore !== null ? (
                      /* Results View */
                      <div className="max-w-2xl mx-auto">
                        <div className="text-center mb-8">
                          <div
                            className={cn(
                              "inline-flex p-4 rounded-2xl mb-4",
                              quizScore >= quizData.length * 0.7
                                ? "bg-green-100"
                                : quizScore >= quizData.length * 0.5
                                ? "bg-amber-100"
                                : "bg-red-100"
                            )}
                          >
                            <Award
                              className={cn(
                                "w-10 h-10",
                                quizScore >= quizData.length * 0.7
                                  ? "text-green-600"
                                  : quizScore >= quizData.length * 0.5
                                  ? "text-amber-600"
                                  : "text-red-600"
                              )}
                            />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900 mb-2">Test Complete!</h2>
                          <p className="text-4xl font-bold text-gray-900">
                            {quizScore} / {quizData.length}
                          </p>
                          <p className="text-gray-500 mt-1">
                            {Math.round((quizScore / quizData.length) * 100)}% Correct
                          </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-3 bg-gray-100 rounded-full mb-8 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              quizScore >= quizData.length * 0.7
                                ? "bg-green-500"
                                : quizScore >= quizData.length * 0.5
                                ? "bg-amber-500"
                                : "bg-red-500"
                            )}
                            style={{ width: `${(quizScore / quizData.length) * 100}%` }}
                          />
                        </div>

                        {/* Question Review */}
                        <div className="space-y-4 mb-8">
                          {quizData.map((q, idx) => {
                            const selectedIdx = parseInt(quizAnswers[idx] || "-1", 10);
                            const isCorrect = selectedIdx === q.correctAnswer;
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "p-4 rounded-xl border-2",
                                  isCorrect
                                    ? "border-green-200 bg-green-50"
                                    : "border-red-200 bg-red-50"
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  {isCorrect ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                                  ) : (
                                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 mb-2">
                                      {idx + 1}. {q.question}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">Correct answer:</span>{" "}
                                      {q.options[q.correctAnswer]}
                                    </p>
                                    {!isCorrect && (
                                      <p className="text-sm text-red-600 mt-1">
                                        <span className="font-medium">Your answer:</span>{" "}
                                        {selectedIdx >= 0 ? q.options[selectedIdx] : "Not answered"}
                                      </p>
                                    )}
                                    {q.explanation && (
                                      <p className="text-sm text-gray-500 mt-2 italic">{q.explanation}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => {
                            setQuizScore(null);
                            setQuizAnswers({});
                            setCurrentQ(0);
                          }}
                          className="w-full py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-teal-700 shadow-lg transition-all"
                        >
                          Retake Test
                        </button>
                      </div>
                    ) : (
                      /* Question View */
                      <div className="max-w-2xl mx-auto">
                        {/* Progress */}
                        <div className="flex items-center justify-between mb-6">
                          <span className="text-sm text-gray-500">
                            Question {currentQ + 1} of {quizData.length}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 bg-gray-100 rounded-full mb-8 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-teal-600 rounded-full transition-all duration-300"
                            style={{ width: `${((currentQ + 1) / quizData.length) * 100}%` }}
                          />
                        </div>

                        {/* Question */}
                        <div className="mb-8">
                          <h3 className="text-lg font-semibold text-gray-900 mb-6">
                            {quizData[currentQ]?.question}
                          </h3>

                          <div className="space-y-3">
                            {quizData[currentQ]?.options.map((option: string, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => setQuizAnswers({ ...quizAnswers, [currentQ]: String(idx) })}
                                className={cn(
                                  "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
                                  quizAnswers[currentQ] === String(idx)
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={cn(
                                      "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                                      quizAnswers[currentQ] === String(idx)
                                        ? "border-blue-500 bg-blue-500"
                                        : "border-gray-300"
                                    )}
                                  >
                                    {quizAnswers[currentQ] === String(idx) && (
                                      <div className="w-2 h-2 bg-white rounded-full" />
                                    )}
                                  </div>
                                  <span className="text-gray-900">{option}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                            disabled={currentQ === 0}
                            className="flex items-center gap-1 px-4 py-2 text-gray-600 font-medium rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                          </button>

                          {currentQ === quizData.length - 1 ? (
                            <button
                              onClick={handleQuizSubmit}
                              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-teal-700 shadow-lg transition-all"
                            >
                              Finish Test
                            </button>
                          ) : (
                            <button
                              onClick={() => setCurrentQ(Math.min(quizData.length - 1, currentQ + 1))}
                              className="flex items-center gap-1 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-teal-700 shadow-lg transition-all"
                            >
                              Next
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Hidden File Input */}
      <input
        id="fileUpload"
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,.sas"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Loading Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600 font-medium">Processing your document...</p>
          </div>
        </div>
      )}
    </div>
  );
}
