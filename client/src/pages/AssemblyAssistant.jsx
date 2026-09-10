import { useEffect, useRef, useState } from 'react';
import api from '../services/api';

const quickPrompts = [
  'What bills are currently under committee review?',
  'Summarize the latest meetings and action items.',
  'Find documents related to budget and finance.',
  'Show committees and their recent recommendations.',
  'Give me a brief summary of the latest motion activity.'
];

const buildThread = (title = 'New conversation') => ({
  id: Date.now() + Math.random(),
  title,
  messages: [
    {
      role: 'assistant',
      text: 'Hello! I can help with bills, motions, committees, meeting summaries, and document searches. Ask me anything about the assembly records.'
    }
  ]
});

const makeThreadTitle = (question) => {
  const cleaned = String(question || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'New conversation';
  return cleaned.length > 28 ? `${cleaned.slice(0, 28)}...` : cleaned;
};

const recordRouteMap = {
  Bill: '/bills',
  Meeting: '/meetings',
  Committee: '/committees',
  Document: '/documents',
  default: '/dashboard'
};

const VOICE_SHORTCUTS = {
  'summarize the latest finance report': 'Summarize the latest finance report.',
  'summarize latest finance report': 'Summarize the latest finance report.',
  'show me the latest finance report': 'Summarize the latest finance report.',
  'what meetings are scheduled tomorrow': 'What meetings are scheduled tomorrow?',
  'what meetings are scheduled for tomorrow': 'What meetings are scheduled tomorrow?',
  'summarize the latest committee report': 'Summarize the latest committee report.',
  'show bills under consideration': 'Show me the bills currently under consideration.',
  'what bills are under consideration': 'Show me the bills currently under consideration.'
};

export default function AssemblyAssistant() {
  const [question, setQuestion] = useState('');
  const [examples, setExamples] = useState([]);
  const [threads, setThreads] = useState(() => [buildThread()]);
  const [activeThreadId, setActiveThreadId] = useState(() => {
    const first = buildThread();
    return first.id;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [listening, setListening] = useState(false);
  const [voiceFirstMode, setVoiceFirstMode] = useState(false);
  const recognitionRef = useRef(null);
  const autoVoiceTriggeredRef = useRef(false);

  useEffect(() => {
    const loadExamples = async () => {
      try {
        const res = await api.get('/assistant/examples');
        setExamples(res.data);
      } catch (err) {
        console.error('Could not load assistant examples', err);
      }
    };

    loadExamples();
  }, []);

  const activeThread = threads.find((thread) => thread.id === activeThreadId) || threads[0];
  const lastAssistantReply = [...(activeThread?.messages || [])].reverse().find((message) => message.role === 'assistant');

  useEffect(() => {
    if (lastAssistantReply?.results?.length) {
      setSelectedEvidence(lastAssistantReply.results[0]);
    } else {
      setSelectedEvidence(null);
    }
  }, [lastAssistantReply]);

  const addMessageToThread = (threadId, message) => {
    setThreads((prev) => prev.map((thread) => {
      if (thread.id !== threadId) return thread;
      return { ...thread, messages: [...thread.messages, message] };
    }));
  };

  const createNewThread = () => {
    const newThread = buildThread();
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
  };

  const askAssistant = async (customQuestion = question, forceAction = false) => {
    const trimmed = (customQuestion || '').trim();
    if (!trimmed) {
      setError('Please enter a question for the assistant.');
      return;
    }

    setError('');
    setLoading(true);

    const threadId = activeThreadId;
    const currentThread = threads.find((thread) => thread.id === threadId) || threads[0];
    const isFreshConversation = currentThread?.messages.length === 1 && currentThread.messages[0].role === 'assistant';

    setThreads((prev) => prev.map((thread) => {
      if (thread.id !== threadId) return thread;
      const nextMessages = [...thread.messages, { role: 'user', text: trimmed }];
      return {
        ...thread,
        title: isFreshConversation ? makeThreadTitle(trimmed) : thread.title,
        messages: nextMessages
      };
    }));

    setQuestion('');

    try {
      const res = await api.post('/assistant/query', { question: trimmed, confirmAction: forceAction });
      const answer = res.data;

      if (answer?.action?.status === 'confirmation_required' || answer?.action?.requiresConfirmation) {
        setPendingAction({ question: trimmed, action: answer.action });
        setThreads((prev) => prev.map((thread) => {
          if (thread.id !== threadId) return thread;
          return {
            ...thread,
            messages: [
              ...thread.messages,
              {
                role: 'assistant',
                text: answer.answer,
                results: [],
                citations: [],
                action: answer.action
              }
            ]
          };
        }));
        return;
      }

      setPendingAction(null);
      setThreads((prev) => prev.map((thread) => {
        if (thread.id !== threadId) return thread;
        return {
          ...thread,
          messages: [
            ...thread.messages,
            {
              role: 'assistant',
              text: answer.answer,
              results: answer.results || [],
              citations: answer.sourceCitations || answer.results?.map((item) => item.citation).filter(Boolean) || []
            }
          ]
        };
      }));
    } catch (err) {
      setThreads((prev) => prev.map((thread) => {
        if (thread.id !== threadId) return thread;
        return {
          ...thread,
          messages: [
            ...thread.messages,
            {
              role: 'assistant',
              text: 'I could not answer that question right now. Please try a different prompt.'
            }
          ]
        };
      }));
      setError(err.response?.data?.message || 'Unable to process the question right now.');
    } finally {
      setLoading(false);
    }
  };

  const startVoiceInput = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const chunks = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'question.webm');

          try {
            setListening(false);
            setLoading(true);
            const res = await api.post('/assistant/speech/transcribe', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            const transcript = res.data?.text || '';
            if (transcript) {
              const normalized = transcript.toLowerCase().trim();
              const mappedPrompt = Object.keys(VOICE_SHORTCUTS).find((shortcut) => normalized.includes(shortcut));
              const finalPrompt = mappedPrompt ? VOICE_SHORTCUTS[mappedPrompt] : transcript;
              setQuestion(finalPrompt);
              await askAssistant(finalPrompt);
            }
          } catch (err) {
            setError(err.response?.data?.message || 'Unable to transcribe speech on the server.');
          } finally {
            setLoading(false);
            stream.getTracks().forEach((track) => track.stop());
          }
        };

        mediaRecorder.start();
        setListening(true);
        setError('');
        setTimeout(() => {
          mediaRecorder.stop();
        }, 4000);
        return;
      } catch (err) {
        console.warn('Server-based voice capture unavailable, falling back to browser speech recognition.', err);
      }
    }

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-KE';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript || '')
          .join(' ')
          .trim();

        if (transcript) {
          const normalized = transcript.toLowerCase().trim();
          const mappedPrompt = Object.keys(VOICE_SHORTCUTS).find((shortcut) => normalized.includes(shortcut));
          const finalPrompt = mappedPrompt ? VOICE_SHORTCUTS[mappedPrompt] : transcript;

          setQuestion(finalPrompt);
          setListening(false);
          askAssistant(finalPrompt);
        }
      };

      recognition.onend = () => setListening(false);
      recognition.onerror = () => {
        setListening(false);
        setError('Voice input is unavailable. Please type your question instead.');
      };

      recognitionRef.current = recognition;
    }

    try {
      recognitionRef.current.start();
      setListening(true);
      setError('');
    } catch (err) {
      setListening(false);
      setError('Microphone is already in use. Please try again in a moment.');
    }
  };

  const speakLastReply = async () => {
    const replyText = lastAssistantReply?.text || '';
    if (!replyText) {
      setError('There is no reply to read aloud yet.');
      return;
    }

    try {
      const res = await api.post('/assistant/speech/synthesize', { text: replyText }, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const audio = new Audio(url);
      audio.play();
    } catch (err) {
      if (!('speechSynthesis' in window)) {
        setError('Text-to-speech is not supported in this browser.');
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(replyText);
      utterance.lang = 'en-KE';
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (!voiceFirstMode || autoVoiceTriggeredRef.current) return;

    autoVoiceTriggeredRef.current = true;
    const timer = setTimeout(() => {
      startVoiceInput();
      setVoiceFirstMode(false);
    }, 900);

    return () => clearTimeout(timer);
  }, [voiceFirstMode]);

  const toggleVoiceFirstMode = () => {
    setVoiceFirstMode((prev) => {
      const next = !prev;
      if (!next) {
        autoVoiceTriggeredRef.current = false;
      }
      return next;
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>ICAMS AI</h1>
        <p>Intelligent County Assembly Assistant</p>
      </div>

      <div className="assistant-brand-card card">
        <div>
          <span className="assistant-brand-label">System identity</span>
          <h3>ICAMS AI</h3>
        </div>
        <p>
          I answer using authorized Assembly records and database information only. I never invent Assembly information,
          I protect confidential access, and I clearly state when information is unavailable in the available Assembly records.
        </p>
      </div>

      <div className="voice-quick-actions">
        <button
          type="button"
          className={`ask-icams-fab ${listening ? 'listening' : ''}`}
          onClick={startVoiceInput}
          title="Ask ICAMS"
          aria-label="Ask ICAMS"
        >
          <span className="fab-icon">🎤</span>
          <span className="fab-label">Ask ICAMS</span>
        </button>

        <button
          type="button"
          className={`voice-first-toggle ${voiceFirstMode ? 'enabled' : ''}`}
          onClick={toggleVoiceFirstMode}
          title="Toggle voice-first mode"
        >
          {voiceFirstMode ? 'Voice-first on' : 'Voice-first'}
        </button>
      </div>

      <div className="assistant-shell">
        <aside className="assistant-sidebar card">
          <div className="assistant-sidebar-header">
            <h3>Chats</h3>
            <button type="button" className="new-chat-button" onClick={createNewThread}>+ New</button>
          </div>

          <div className="assistant-thread-list">
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                className={`assistant-thread ${thread.id === activeThreadId ? 'active' : ''}`}
                onClick={() => setActiveThreadId(thread.id)}
              >
                <span>{thread.title}</span>
                <small>{thread.messages.filter((message) => message.role === 'user').length} asks</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="card assistant-chat-card assistant-main">
          <div className="assistant-chat-header">
            <div>
              <h2>{activeThread?.title || 'Assembly Chat'}</h2>
              <span>Live record lookup and summary assistant</span>
            </div>
          </div>

          <div className="assistant-chat-box">
            {(activeThread?.messages || []).map((message, index) => (
              <div key={`${message.role}-${index}`} className={`chat-row ${message.role}`}>
                <div className="chat-bubble">
                  {message.text}
                  {(message.citations || []).length > 0 && (
                    <div className="assistant-citation-list">
                      {message.citations.map((citation, citationIndex) => (
                        <div key={`${message.role}-${citationIndex}`} className="assistant-citation-item">
                          <span className="assistant-citation-label">Source:</span>
                          <span>{citation.label}</span>
                          <a href={citation.url || '/dashboard'} className="assistant-source-link small" onClick={(event) => event.stopPropagation()}>
                            View Source
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-row assistant">
                <div className="chat-bubble typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          {pendingAction && (
            <div className="assistant-confirmation-panel">
              <h3>Confirm action</h3>
              <p>{pendingAction.action.answer}</p>
              <div className="assistant-confirmation-actions">
                <button type="button" className="primary-button" onClick={() => askAssistant(pendingAction.question, true)} disabled={loading}>
                  Confirm and proceed
                </button>
                <button type="button" className="secondary-button" onClick={() => setPendingAction(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {lastAssistantReply?.results?.length > 0 && (
            <>
              <div className="assistant-results-panel">
                <h3>Source records</h3>
                <div className="assistant-results-grid">
                  {lastAssistantReply.results.map((item, index) => {
                    const metadataEntries = Object.entries(item.metadata || {}).filter(([, value]) => value && value !== 'Unassigned' && value !== 'Unknown');
                    const destination = recordRouteMap[item.type] || recordRouteMap.default;

                    return (
                      <button
                        key={`${item.type}-${item.title}-${index}`}
                        type="button"
                        className={`assistant-result-card ${selectedEvidence?.title === item.title && selectedEvidence?.type === item.type ? 'selected' : ''}`}
                        onClick={() => setSelectedEvidence(item)}
                      >
                        <span className="assistant-result-type">{item.type}</span>
                        <strong>{item.title}</strong>
                        <small>
                          {item.status || 'Status unavailable'}
                          {item.relatedDate ? ` • ${new Date(item.relatedDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}
                        </small>
                        <div className="assistant-result-meta">
                          {item.category && <span>{item.category}</span>}
                          {item.sourceType && <span>{item.sourceType}</span>}
                        </div>
                        <p>{item.summary}</p>
                        {metadataEntries.length > 0 && (
                          <ul className="assistant-result-details">
                            {metadataEntries.map(([key, value]) => (
                              <li key={`${item.title}-${key}`}>
                                <span>{key}</span>
                                <strong>{String(value)}</strong>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="assistant-card-citation">
                          <span className="assistant-citation-label">Source:</span>
                          <span>{item.citation?.label || `${item.title} — ${new Date(item.relatedDate || Date.now()).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}`}</span>
                        </div>
                        <a href={item.citation?.url || destination} className="assistant-source-link" onClick={(event) => event.stopPropagation()}>
                          View Source
                        </a>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedEvidence && (
                <div className="assistant-detail-panel">
                  <div className="assistant-detail-header">
                    <div>
                      <span className="assistant-result-type">Selected evidence</span>
                      <h4>{selectedEvidence.title}</h4>
                    </div>
                    <a href={selectedEvidence.citation?.url || recordRouteMap[selectedEvidence.type] || recordRouteMap.default} className="assistant-source-link primary">
                      View Source
                    </a>
                  </div>

                  <div className="assistant-detail-body">
                    <p>{selectedEvidence.summary}</p>

                    {selectedEvidence.citation && (
                      <div className="assistant-citation-summary">
                        <span className="assistant-citation-label">Source:</span>
                        <span>{selectedEvidence.citation.label}</span>
                      </div>
                    )}

                    <div className="assistant-detail-grid">
                      <div>
                        <label>Type</label>
                        <strong>{selectedEvidence.type}</strong>
                      </div>
                      <div>
                        <label>Status</label>
                        <strong>{selectedEvidence.status || 'Not specified'}</strong>
                      </div>
                      <div>
                        <label>Category</label>
                        <strong>{selectedEvidence.category || 'Assembly records'}</strong>
                      </div>
                      <div>
                        <label>Date</label>
                        <strong>
                          {selectedEvidence.relatedDate
                            ? new Date(selectedEvidence.relatedDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })
                            : 'Date not specified'}
                        </strong>
                      </div>
                    </div>

                    {selectedEvidence.metadata && Object.keys(selectedEvidence.metadata).length > 0 && (
                      <div className="assistant-detail-metadata">
                        {Object.entries(selectedEvidence.metadata)
                          .filter(([, value]) => value && value !== 'Unassigned' && value !== 'Unknown')
                          .map(([key, value]) => (
                            <div key={`${selectedEvidence.title}-${key}`}>
                              <label>{key}</label>
                              <strong>{String(value)}</strong>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="assistant-suggestions">
            {(examples.length ? examples : quickPrompts).map((item) => (
              <button
                key={item}
                type="button"
                className="chat-suggestion"
                onClick={() => askAssistant(item)}
                disabled={loading}
              >
                {item}
              </button>
            ))}
          </div>

          <form
            className="assistant-input-row"
            onSubmit={(event) => {
              event.preventDefault();
              askAssistant();
            }}
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about a bill, committee, motion, or meeting..."
              disabled={loading}
            />
            <button
              type="button"
              className={`voice-button ${listening ? 'listening' : ''}`}
              onClick={startVoiceInput}
              title="Speak a question"
              disabled={loading}
            >
              {listening ? 'Listening...' : '🎤'}
            </button>
            <button
              type="button"
              className="voice-button"
              onClick={speakLastReply}
              title="Read the latest reply aloud"
              disabled={loading || !lastAssistantReply?.text}
            >
              🔊
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Thinking...' : 'Send'}
            </button>
          </form>

          {error && <div className="notification error">{error}</div>}
        </section>
      </div>
    </div>
  );
}
