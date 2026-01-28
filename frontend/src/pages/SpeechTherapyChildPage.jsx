import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { PlayCircle, Mic, Square, Upload, AlertCircle, CheckCircle, Volume2, Star, Award, Trophy, Info, LineChart } from 'lucide-react';
import { LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SpeechTherapyChildPage() {
  const [selectedChild, setSelectedChild] = useState('');
  const [children, setChildren] = useState([]);
  const [permission, setPermission] = useState(false);
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [practicePrompt, setPracticePrompt] = useState('');
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [progressData, setProgressData] = useState([]);
  const [activeTab, setActiveTab] = useState('practice');
  const [recognizedText, setRecognizedText] = useState('');
  const [matchScore, setMatchScore] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [interimText, setInterimText] = useState('');
  
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const sampleAudioRef = useRef(null);
  const audioBlobUrl = useRef(null);
  const recognitionRef = useRef(null);
  const recognitionResultsRef = useRef([]);

  // Sample practice prompts with visual support
  const practicePrompts = [
    { text: 'Hello', description: 'Say "Hello"', icon: '👋', color: 'blue' },
    { text: 'Thank you', description: 'Say "Thank you"', icon: '🙏', color: 'purple' },
    { text: 'Good morning', description: 'Say "Good morning"', icon: '☀️', color: 'yellow' },
    { text: 'I am happy', description: 'Say "I am happy"', icon: '😊', color: 'pink' },
    { text: 'Can I play?', description: 'Say "Can I play?"', icon: '⚽', color: 'green' },
    { text: 'I like this', description: 'Say "I like this"', icon: '👍', color: 'indigo' },
    { text: 'Help me please', description: 'Say "Help me please"', icon: '🙋', color: 'teal' },
    { text: 'My name is', description: 'Say "My name is..."', icon: '🆔', color: 'cyan' }
  ];

  // Phonemes for basic sound practice
  const phonemes = [
    { text: 'BA', icon: '🐑', color: 'blue' },
    { text: 'MA', icon: '👩', color: 'pink' },
    { text: 'PA', icon: '👨', color: 'purple' },
    { text: 'TA', icon: '🥁', color: 'orange' },
    { text: 'DA', icon: '🦆', color: 'yellow' },
    { text: 'LA', icon: '🍭', color: 'red' },
    { text: 'SA', icon: '🐍', color: 'green' },
    { text: 'KA', icon: '🔑', color: 'teal' }
  ];

  // Calculate similarity between two strings (0-100%)
  const calculateSimilarity = (str1, str2) => {
    // Normalize strings: lowercase and trim
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 100;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    // Levenshtein distance algorithm
    const matrix = [];
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    const distance = matrix[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    const similarity = ((maxLength - distance) / maxLength) * 100;
    
    return Math.round(similarity);
  };
  
  // Generate feedback based on match score
  const generateFeedback = (score) => {
    if (score >= 90) {
      return {
        message: "Amazing! Perfect pronunciation! 🌟",
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-300',
        icon: '🎉'
      };
    } else if (score >= 75) {
      return {
        message: "Great job! Very close! 👏",
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        icon: '👍'
      };
    } else if (score >= 60) {
      return {
        message: "Good try! Keep practicing! 💪",
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-300',
        icon: '⭐'
      };
    } else if (score >= 40) {
      return {
        message: "Almost there! Try again! 🙂",
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-300',
        icon: '💫'
      };
    } else {
      return {
        message: "Keep going! You can do it! 🌈",
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-300',
        icon: '🌟'
      };
    }
  };

  const colorMap = {
    blue: 'bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300 text-blue-700',
    purple: 'bg-purple-50 hover:bg-purple-100 border-purple-200 hover:border-purple-300 text-purple-700',
    yellow: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200 hover:border-yellow-300 text-yellow-700',
    pink: 'bg-pink-50 hover:bg-pink-100 border-pink-200 hover:border-pink-300 text-pink-700',
    green: 'bg-green-50 hover:bg-green-100 border-green-200 hover:border-green-300 text-green-700',
    indigo: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 hover:border-indigo-300 text-indigo-700',
    teal: 'bg-teal-50 hover:bg-teal-100 border-teal-200 hover:border-teal-300 text-teal-700',
    cyan: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200 hover:border-cyan-300 text-cyan-700',
    orange: 'bg-orange-50 hover:bg-orange-100 border-orange-200 hover:border-orange-300 text-orange-700',
    red: 'bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300 text-red-700'
  };

  useEffect(() => {
    fetchChildren();
    
    // Initialize Speech Recognition once
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;
      console.log('Speech recognition initialized');
    } else {
      console.warn('Speech Recognition API not supported');
    }
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchProgress();
    }
  }, [selectedChild]);

  // Cleanup: Stop media stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        console.log('Media stream stopped');
      }
      // Cleanup blob URL
      if (audioBlobUrl.current) {
        URL.revokeObjectURL(audioBlobUrl.current);
      }
      // Stop speech recognition if active
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Recognition already stopped');
        }
      }
    };
  }, [stream]);

  const fetchProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/speech-therapy/progress/${selectedChild}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.sessions && response.data.sessions.length > 0) {
        setProgressData(response.data.sessions.map(s => ({
          name: new Date(s.date).toLocaleDateString(),
          score: s.rating === 'Good' ? 3 : s.rating === 'Average' ? 2 : s.rating === 'Poor' ? 1 : 0
        })));
      } else {
        setProgressData([
          { name: 'Day 1', score: 1 },
          { name: 'Day 2', score: 1.5 },
          { name: 'Day 3', score: 2 },
          { name: 'Day 4', score: 2.5 },
          { name: 'Day 5', score: 3 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const fetchChildren = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      let endpoint = '';
      if (user.role === 'parent') {
        endpoint = 'http://localhost:5000/api/parent/children';
      } else if (user.role === 'teacher') {
        endpoint = 'http://localhost:5000/api/teacher/students';
      }

      if (endpoint) {
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setChildren(Array.isArray(response.data) ? response.data : []);
        if (response.data.length > 0) {
          setSelectedChild(response.data[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  const getMicrophonePermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Your browser does not support audio recording. Please use Chrome, Firefox, or Edge.");
      return;
    }

    try {
      const streamData = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      setPermission(true);
      setStream(streamData);
      console.log('Microphone access granted');
    } catch (err) {
      console.error('Microphone permission error:', err);
      if (err.name === 'NotAllowedError') {
        alert("Microphone permission denied. Please allow microphone access in your browser settings.");
      } else if (err.name === 'NotFoundError') {
        alert("No microphone found. Please connect a microphone and try again.");
      } else {
        alert("Error accessing microphone: " + err.message);
      }
    }
  };

  const playSampleAudio = (textToPlay = practicePrompt) => {
    if (!textToPlay) {
      alert('Please select a practice prompt first!');
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(textToPlay);
    utterance.rate = playbackSpeed;
    utterance.pitch = 1.1;
    
    utterance.onstart = () => setIsPlayingSample(true);
    utterance.onend = () => setIsPlayingSample(false);
    
    window.speechSynthesis.speak(utterance);
  };

  // Start speech recognition
  const startSpeechRecognition = () => {
    if (!recognitionRef.current) {
      console.warn('Speech recognition not available');
      return;
    }

    recognitionResultsRef.current = [];
    setRecognizedText('');
    setInterimText('');
    setMatchScore(null);

    const recognition = recognitionRef.current;

    recognition.onstart = () => {
      console.log('Speech recognition started');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          recognitionResultsRef.current.push(transcript);
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        setInterimText(interimTranscript);
      }
      
      if (finalTranscript) {
        const allText = recognitionResultsRef.current.join(' ');
        console.log('Final transcript so far:', allText);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        console.log('No speech detected, but continuing...');
      } else if (event.error !== 'aborted') {
        setFeedbackMessage('Speech recognition error: ' + event.error);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
    };

    try {
      recognition.start();
      console.log('Speech recognition started successfully');
    } catch (error) {
      console.error('Error starting recognition:', error);
    }
  };

  // Stop speech recognition and process results
  const stopSpeechRecognition = () => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
      
      // Process final results after a short delay
      setTimeout(() => {
        const finalText = recognitionResultsRef.current.join(' ').trim();
        console.log('Final recognized text:', finalText);
        
        if (finalText) {
          setRecognizedText(finalText);
          
          // Calculate match score
          const score = calculateSimilarity(finalText, practicePrompt);
          setMatchScore(score);
          
          // Generate feedback
          const feedback = generateFeedback(score);
          setFeedbackMessage(feedback.message);
          
          // Show celebration for high scores
          if (score >= 90) {
            setShowCelebration(true);
            setTimeout(() => setShowCelebration(false), 3000);
          }
        } else {
          setRecognizedText('(No speech detected)');
          setMatchScore(0);
          setFeedbackMessage('Try speaking louder or closer to the microphone.');
        }
        
        setInterimText('');
      }, 500);
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  };

  const startRecording = () => {
    if (!practicePrompt) {
      alert('Please select a practice prompt first!');
      return;
    }

    if (!stream) {
      alert('Microphone not initialized. Please enable microphone first.');
      return;
    }

    try {
      // Reset audio chunks and recognition results
      audioChunks.current = [];
      recognitionResultsRef.current = [];
      setAudioBlob(null);
      setUploadStatus(null);
      setRecognizedText('');
      setInterimText('');
      setMatchScore(null);
      setFeedbackMessage('');
      
      // Determine the best supported MIME type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const media = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = media;

      // Set up event handler BEFORE starting
      media.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunks.current.push(event.data);
          console.log('Audio chunk received:', event.data.size, 'bytes');
        }
      };

      media.onstop = () => {
        console.log('Recording stopped. Total chunks:', audioChunks.current.length);
        if (audioChunks.current.length > 0) {
          const blob = new Blob(audioChunks.current, { type: mimeType });
          console.log('Audio blob created:', blob.size, 'bytes');
          setAudioBlob(blob);
        } else {
          console.error('No audio data captured');
          alert('No audio was recorded. Please try again.');
        }
      };

      media.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        alert('Recording error: ' + event.error);
        setIsRecording(false);
      };

      // Start MediaRecorder
      media.start();
      setIsRecording(true);
      console.log('Recording started with MIME type:', mimeType);
      
      // Start Speech Recognition with slight delay for Chrome
      setTimeout(() => {
        startSpeechRecognition();
      }, 100);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Failed to start recording: ' + err.message);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorder.current) {
      console.error('No active recording');
      return;
    }

    try {
      if (mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
        setIsRecording(false);
        console.log('Stopping recording...');
        
        // Stop speech recognition
        stopSpeechRecognition();
      }
    } catch (err) {
      console.error('Error stopping recording:', err);
      alert('Error stopping recording: ' + err.message);
      setIsRecording(false);
    }
  };

  const handleUpload = async () => {
    if (!audioBlob || !selectedChild) {
      alert('Please select a child and record audio first!');
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'speech-recording.webm');
      formData.append('childId', selectedChild);
      formData.append('practicePrompt', practicePrompt);

      const response = await axios.post(
        'http://localhost:5000/api/speech-therapy/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      setUploadStatus({ type: 'success', message: 'Great job! Recording sent for review.' });
      setAudioBlob(null);
      setPracticePrompt('');
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 5000);
      fetchProgress();
      
    } catch (error) {
      console.error('Error uploading recording:', error);
      setUploadStatus({ type: 'error', message: 'Failed to upload recording. Please try again.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Header with soft rounded design */}
        <div className="text-center mb-10">
          <div className="inline-block bg-white rounded-3xl shadow-sm px-8 py-6 mb-6">
            <h1 className="text-4xl font-bold text-gray-700 mb-2 flex items-center justify-center gap-3">
              <span className="text-5xl">🎤</span>
              Speech Practice
            </h1>
            <p className="text-gray-500 text-base font-medium">
              Practice speaking in a fun and calm way!
            </p>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex justify-center gap-3">
            <button 
              onClick={() => setActiveTab('practice')}
              className={`px-8 py-3 rounded-2xl font-semibold transition-all duration-300 shadow-sm ${
                activeTab === 'practice' 
                  ? 'bg-blue-100 text-blue-700 shadow-md scale-105' 
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Practice
            </button>
            <button 
              onClick={() => setActiveTab('progress')}
              className={`px-8 py-3 rounded-2xl font-semibold transition-all duration-300 shadow-sm ${
                activeTab === 'progress' 
                  ? 'bg-indigo-100 text-indigo-700 shadow-md scale-105' 
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              My Progress
            </button>
          </div>
        </div>

        {/* Celebration Modal */}
        {showCelebration && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-10 backdrop-blur-sm">
            <div className="bg-white p-10 rounded-3xl shadow-2xl border-4 border-yellow-200 flex flex-col items-center animate-bounce">
              <Trophy size={80} className="text-yellow-400 mb-4" />
              <h2 className="text-4xl font-bold text-gray-700">Amazing!</h2>
              <p className="text-xl text-gray-500 mt-2">You earned a Gold Star! ⭐</p>
              <div className="flex gap-2 mt-6">
                <Star className="text-yellow-400 fill-yellow-400" size={36} />
                <Star className="text-yellow-400 fill-yellow-400" size={36} />
                <Star className="text-yellow-400 fill-yellow-400" size={36} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'practice' ? (
          <div className="space-y-6">
            
            {/* Child Selection */}
            {children.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm p-8">
                <label className="block text-lg font-semibold text-gray-600 mb-4">
                  👤 Who is practicing today?
                </label>
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-blue-300 focus:outline-none transition-all bg-gray-50"
                >
                  {children.map((child) => (
                    <option key={child._id} value={child._id}>
                      {child.name} ({child.age} years old)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Phoneme Section */}
            <div className="bg-white rounded-3xl shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <Volume2 size={28} className="text-purple-400" />
                <h2 className="text-2xl font-bold text-gray-700">Basic Sounds</h2>
              </div>
              <p className="text-gray-500 mb-6 text-sm">Click a sound to hear it!</p>
              
              <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                {phonemes.map((ph, idx) => (
                  <button
                    key={idx}
                    onClick={() => playSampleAudio(ph.text)}
                    className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-200 transform hover:scale-105 hover:shadow-md ${colorMap[ph.color]}`}
                  >
                    <span className="text-3xl mb-2">{ph.icon}</span>
                    <span className="font-bold text-sm">{ph.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Practice Prompt Selection */}
            <div className="bg-white rounded-3xl shadow-sm p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-700">
                  Choose a Word or Phrase
                </h2>
                <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
                  <span className="text-sm font-semibold text-blue-600">Speed:</span>
                  <button 
                    onClick={() => setPlaybackSpeed(1.0)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      playbackSpeed === 1.0 ? 'bg-blue-500 text-white shadow-sm' : 'text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    Normal
                  </button>
                  <button 
                    onClick={() => setPlaybackSpeed(0.5)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      playbackSpeed === 0.5 ? 'bg-blue-500 text-white shadow-sm' : 'text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    Slow
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {practicePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPracticePrompt(prompt.text)}
                    className={`p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-3 transform hover:scale-105 ${
                      practicePrompt === prompt.text
                        ? `${colorMap[prompt.color]} shadow-lg scale-105`
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-4xl">{prompt.icon}</span>
                    <div className="font-bold text-sm">{prompt.text}</div>
                  </button>
                ))}
              </div>
              
              {/* Selected Prompt Display */}
              {practicePrompt && (
                <div className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl border-2 border-blue-100">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-5xl shadow-sm">
                        {practicePrompts.find(p => p.text === practicePrompt)?.icon}
                      </div>
                      <div>
                        <p className="text-sm text-indigo-500 font-semibold uppercase tracking-wide mb-1">
                          Let's practice:
                        </p>
                        <p className="text-4xl font-black text-indigo-700">"{practicePrompt}"</p>
                      </div>
                    </div>
                    <button
                      onClick={() => playSampleAudio()}
                      disabled={isPlayingSample}
                      className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold shadow-lg transition-all duration-200 transform hover:scale-105 ${
                        isPlayingSample ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'
                      }`}
                    >
                      <Volume2 size={24} />
                      {isPlayingSample ? 'Playing...' : 'Hear it'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Recording Interface */}
            <div className="bg-white rounded-3xl shadow-sm p-10">
              <h2 className="text-3xl font-bold text-gray-700 mb-8 text-center">
                🎙️ Record Your Voice
              </h2>

              {!permission ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-8 text-lg">
                    We need permission to use your microphone
                  </p>
                  <button
                    onClick={getMicrophonePermission}
                    className="bg-blue-500 text-white font-semibold py-5 px-10 rounded-3xl hover:bg-blue-600 transition-all duration-200 text-lg inline-flex items-center gap-3 shadow-lg transform hover:scale-105"
                  >
                    <Mic size={28} />
                    Enable Microphone
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  
                  {/* Large Recording Button */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={!practicePrompt}
                      className={`w-48 h-48 rounded-full text-white font-bold text-2xl transition-all duration-300 transform shadow-2xl flex flex-col items-center justify-center ${
                        !practicePrompt
                          ? 'bg-gray-300 cursor-not-allowed'
                          : isRecording
                          ? 'bg-red-400 hover:bg-red-500 scale-110 animate-pulse ring-8 ring-red-200'
                          : 'bg-green-400 hover:bg-green-500 hover:scale-110 ring-8 ring-green-100'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <Square size={64} strokeWidth={3} />
                          <span className="text-base mt-3 font-black uppercase tracking-wider">Stop</span>
                        </>
                      ) : (
                        <>
                          <Mic size={64} strokeWidth={3} />
                          <span className="text-base mt-3 font-black uppercase tracking-wider">Record</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Recording Indicator */}
                  {isRecording && (
                    <div className="text-center space-y-4">
                      <div className="inline-flex items-center gap-3 bg-red-50 px-6 py-3 rounded-3xl border-2 border-red-200">
                        <span className="w-4 h-4 bg-red-400 rounded-full animate-ping"></span>
                        <p className="text-xl font-bold text-red-600 uppercase tracking-wider">
                          Recording...
                        </p>
                      </div>
                      <p className="text-gray-600 mt-6 text-2xl font-medium">Say: "{practicePrompt}"</p>
                      
                      {/* Live Recognition Feedback */}
                      {interimText && (
                        <div className="mt-6 bg-blue-50 rounded-3xl p-6 border-2 border-blue-200 animate-pulse">
                          <p className="text-sm text-blue-500 font-semibold mb-2">🎤 Listening...</p>
                          <p className="text-lg text-blue-700 font-medium italic">"{interimText}"</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audio Playback */}
                  {audioBlob && !isRecording && (
                    <div className="bg-green-50 rounded-3xl p-8 border-2 border-green-200">
                      <div className="flex items-center justify-center gap-3 mb-6">
                        <CheckCircle className="text-green-500" size={32} />
                        <p className="text-green-700 font-bold text-xl">
                          Recording Complete! 🎉
                        </p>
                      </div>
                      <audio
                        src={(() => {
                          // Clean up previous URL
                          if (audioBlobUrl.current) {
                            URL.revokeObjectURL(audioBlobUrl.current);
                          }
                          // Create new URL
                          audioBlobUrl.current = URL.createObjectURL(audioBlob);
                          return audioBlobUrl.current;
                        })()}
                        controls
                        className="w-full mb-8 rounded-2xl"
                        style={{ height: '54px' }}
                      />

                      {/* Speech Analysis Results */}
                      {matchScore !== null && recognizedText && (
                        <div className={`rounded-3xl p-6 mb-6 border-2 ${generateFeedback(matchScore).bgColor} ${generateFeedback(matchScore).borderColor}`}>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <span className="text-4xl">{generateFeedback(matchScore).icon}</span>
                              <h3 className={`text-xl font-bold ${generateFeedback(matchScore).color}`}>
                                Speech Analysis
                              </h3>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className={`text-4xl font-black ${generateFeedback(matchScore).color}`}>
                                {matchScore}%
                              </div>
                              <span className="text-xs text-gray-500 font-semibold">Match Score</span>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="bg-white rounded-2xl p-4 border-2 border-gray-200">
                              <p className="text-sm text-gray-500 font-semibold mb-2">Expected:</p>
                              <p className="text-lg font-bold text-gray-700">"{practicePrompt}"</p>
                            </div>
                            
                            <div className="bg-white rounded-2xl p-4 border-2 border-gray-200">
                              <p className="text-sm text-gray-500 font-semibold mb-2">You Said:</p>
                              <p className="text-lg font-bold text-gray-700">"{recognizedText}"</p>
                            </div>
                            
                            <div className={`rounded-2xl p-4 text-center ${generateFeedback(matchScore).bgColor}`}>
                              <p className={`text-xl font-bold ${generateFeedback(matchScore).color}`}>
                                {generateFeedback(matchScore).message}
                              </p>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mt-4">
                              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-1000 ${
                                    matchScore >= 90 ? 'bg-green-500' : 
                                    matchScore >= 75 ? 'bg-blue-500' : 
                                    matchScore >= 60 ? 'bg-yellow-500' : 
                                    matchScore >= 40 ? 'bg-orange-500' : 
                                    'bg-purple-500'
                                  }`}
                                  style={{ width: `${matchScore}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row gap-4">
                        <button
                          onClick={handleUpload}
                          disabled={isUploading}
                          className="flex-1 bg-indigo-500 text-white py-5 rounded-2xl font-bold text-lg hover:bg-indigo-600 disabled:bg-indigo-300 flex items-center justify-center gap-3 shadow-lg transition-all duration-200 transform hover:scale-105"
                        >
                          <Award size={28} />
                          {isUploading ? 'Sending...' : 'Send to Teacher'}
                        </button>
                        <button
                          onClick={() => {
                            // Clean up blob URL before resetting
                            if (audioBlobUrl.current) {
                              URL.revokeObjectURL(audioBlobUrl.current);
                              audioBlobUrl.current = null;
                            }
                            setAudioBlob(null);
                            setRecognizedText('');
                            setInterimText('');
                            setMatchScore(null);
                            setFeedbackMessage('');
                            recognitionResultsRef.current = [];
                          }}
                          className="md:w-48 py-5 border-2 border-gray-300 bg-white rounded-2xl font-bold text-gray-600 hover:bg-gray-50 transition-all duration-200"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          
          /* Progress Tab */
          <div className="bg-white rounded-3xl shadow-sm p-10">
            <div className="flex items-center gap-3 mb-8">
              <LineChart className="text-indigo-500" size={32} />
              <h2 className="text-3xl font-bold text-gray-700">Your Progress</h2>
            </div>
            
            <div className="h-[320px] w-full mb-10 bg-gray-50 rounded-2xl p-6">
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis domain={[0, 3]} ticks={[1, 2, 3]} stroke="#9ca3af" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid #e5e7eb' }} />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#6366f1" 
                    strokeWidth={4} 
                    dot={{ r: 7, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }}
                    activeDot={{ r: 9 }} 
                  />
                </ReLineChart>
              </ResponsiveContainer>
              <div className="flex justify-between text-sm text-gray-400 px-12 mt-3">
                <span>Needs Practice</span>
                <span>Getting Better</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Achievement Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-3xl flex flex-col items-center border-2 border-green-100">
                <Star className="text-green-500 mb-3" size={40} />
                <span className="text-5xl font-bold text-green-600 mb-2">12</span>
                <span className="text-base text-green-600 font-semibold">Stars Earned</span>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-8 rounded-3xl flex flex-col items-center border-2 border-blue-100">
                <Award className="text-blue-500 mb-3" size={40} />
                <span className="text-5xl font-bold text-blue-600 mb-2">5</span>
                <span className="text-base text-blue-600 font-semibold">Badges Won</span>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-3xl flex flex-col items-center border-2 border-purple-100">
                <Trophy className="text-purple-500 mb-3" size={40} />
                <span className="text-5xl font-bold text-purple-600 mb-2">3</span>
                <span className="text-base text-purple-600 font-semibold">Week Streak</span>
              </div>
            </div>
          </div>
        )}

        {/* Upload Status */}
        {uploadStatus && (
          <div className={`rounded-3xl p-6 flex items-start gap-4 shadow-sm ${
            uploadStatus.type === 'success' 
              ? 'bg-green-50 border-2 border-green-200' 
              : 'bg-red-50 border-2 border-red-200'
          }`}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="text-green-500 shrink-0" size={32} />
            ) : (
              <AlertCircle className="text-red-500 shrink-0" size={32} />
            )}
            <p className={`font-bold text-lg ${
              uploadStatus.type === 'success' ? 'text-green-700' : 'text-red-700'
            }`}>
              {uploadStatus.message}
            </p>
          </div>
        )}

        {/* Instructions & Disclaimer */}
        <div className="bg-white rounded-3xl shadow-sm p-8 border-l-8 border-indigo-300">
          <div className="flex items-center gap-3 mb-4">
            <Info className="text-indigo-500" size={24} />
            <h3 className="text-xl font-bold text-gray-700">About This Practice</h3>
          </div>
          <p className="text-gray-600 mb-6 text-base leading-relaxed">
            This tool helps children practice speaking and communication skills in a supportive way. 
            This is <strong>not a medical tool</strong> and does not provide diagnosis. 
            For professional support, please consult a speech therapist.
          </p>
          <h4 className="font-bold text-gray-700 mb-3 text-lg">How to Use:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3 items-start">
              <span className="text-2xl">1️⃣</span>
              <span className="text-gray-600">Pick a word or sound</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-2xl">2️⃣</span>
              <span className="text-gray-600">Click "Hear it" to listen</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-2xl">3️⃣</span>
              <span className="text-gray-600">Press RECORD button</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-2xl">4️⃣</span>
              <span className="text-gray-600">Say the word clearly</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-2xl">5️⃣</span>
              <span className="text-gray-600">Press STOP when done</span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-2xl">6️⃣</span>
              <span className="text-gray-600">Send to your teacher!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
