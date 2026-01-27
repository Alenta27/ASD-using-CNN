import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { PlayCircle, Mic, Square, Upload, AlertCircle, CheckCircle, Volume2 } from 'lucide-react';

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
  
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const sampleAudioRef = useRef(null);

  // Sample practice prompts
  const practicePrompts = [
    { text: 'Hello', description: 'Say "Hello"' },
    { text: 'Thank you', description: 'Say "Thank you"' },
    { text: 'Good morning', description: 'Say "Good morning"' },
    { text: 'I am happy', description: 'Say "I am happy"' },
    { text: 'Can I play?', description: 'Say "Can I play?"' },
    { text: 'I like this', description: 'Say "I like this"' },
    { text: 'Help me please', description: 'Say "Help me please"' },
    { text: 'My name is', description: 'Say "My name is..."' }
  ];

  // Fetch children on component mount
  useEffect(() => {
    fetchChildren();
  }, []);

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
    if ("MediaRecorder" in window) {
      try {
        const streamData = await navigator.mediaDevices.getUserMedia({ audio: true });
        setPermission(true);
        setStream(streamData);
      } catch (err) {
        alert("Microphone permission denied: " + err.message);
      }
    } else {
      alert("The MediaRecorder API is not supported in your browser.");
    }
  };

  const playSampleAudio = () => {
    if (!practicePrompt) {
      alert('Please select a practice prompt first!');
      return;
    }
    
    // Use text-to-speech API or pre-recorded samples
    const utterance = new SpeechSynthesisUtterance(practicePrompt);
    utterance.rate = 0.8; // Slower speech for clarity
    utterance.pitch = 1.1;
    
    utterance.onstart = () => setIsPlayingSample(true);
    utterance.onend = () => setIsPlayingSample(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = () => {
    if (!practicePrompt) {
      alert('Please select a practice prompt first!');
      return;
    }

    setIsRecording(true);
    setAudioBlob(null);
    setUploadStatus(null);
    
    const media = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorder.current = media;
    mediaRecorder.current.start();
    
    let localAudioChunks = [];
    mediaRecorder.current.ondataavailable = (event) => {
      if (typeof event.data === "undefined" || event.data.size === 0) return;
      localAudioChunks.push(event.data);
    };
    audioChunks.current = localAudioChunks;
  };

  const stopRecording = () => {
    setIsRecording(false);
    mediaRecorder.current.stop();
    mediaRecorder.current.onstop = () => {
      const blob = new Blob(audioChunks.current, { type: "audio/webm" });
      setAudioBlob(blob);
      audioChunks.current = [];
    };
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

      setUploadStatus({ type: 'success', message: 'Recording uploaded successfully! Your teacher will review it soon.' });
      setAudioBlob(null);
      setPracticePrompt('');
      
    } catch (error) {
      console.error('Error uploading recording:', error);
      setUploadStatus({ type: 'error', message: 'Failed to upload recording. Please try again.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 mt-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎤 Speech Practice
          </h1>
          <p className="text-gray-600 text-lg">
            Practice speaking and improve your communication skills!
          </p>
        </div>

        {/* Child Selection */}
        {children.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <label className="block text-lg font-semibold text-gray-700 mb-3">
              Who is practicing today?
            </label>
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
            >
              {children.map((child) => (
                <option key={child._id} value={child._id}>
                  {child.name} ({child.age} years old)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Practice Prompt Selection */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <label className="block text-lg font-semibold text-gray-700 mb-3">
            Choose what to practice:
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {practicePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => setPracticePrompt(prompt.text)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  practicePrompt === prompt.text
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                <div className="font-semibold">{prompt.text}</div>
              </button>
            ))}
          </div>
          
          {practicePrompt && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">You selected:</p>
                <p className="text-2xl font-bold text-blue-700">"{practicePrompt}"</p>
              </div>
              <button
                onClick={playSampleAudio}
                disabled={isPlayingSample}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold ${
                  isPlayingSample ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                <Volume2 size={20} />
                {isPlayingSample ? 'Playing...' : 'Listen'}
              </button>
            </div>
          )}
        </div>

        {/* Recording Interface */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Record Your Voice
          </h2>

          {!permission ? (
            <div className="text-center">
              <p className="text-gray-600 mb-6 text-lg">
                We need permission to use your microphone
              </p>
              <button
                onClick={getMicrophonePermission}
                className="bg-blue-600 text-white font-semibold py-4 px-8 rounded-xl hover:bg-blue-700 transition text-lg flex items-center gap-2 mx-auto"
              >
                <Mic size={24} />
                Enable Microphone
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Recording Button */}
              <div className="flex justify-center">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!practicePrompt}
                  className={`w-32 h-32 rounded-full text-white font-bold text-xl transition-all transform hover:scale-105 ${
                    !practicePrompt
                      ? 'bg-gray-400 cursor-not-allowed'
                      : isRecording
                      ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isRecording ? (
                    <div className="flex flex-col items-center">
                      <Square size={40} />
                      <span className="text-sm mt-2">Stop</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Mic size={40} />
                      <span className="text-sm mt-2">Record</span>
                    </div>
                  )}
                </button>
              </div>

              {isRecording && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600 animate-pulse">
                    🔴 Recording...
                  </p>
                  <p className="text-gray-600 mt-2">Say: "{practicePrompt}"</p>
                </div>
              )}

              {/* Audio Playback */}
              {audioBlob && !isRecording && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-center text-gray-700 font-semibold mb-4">
                    ✅ Recording Complete! Listen to your voice:
                  </p>
                  <audio
                    src={URL.createObjectURL(audioBlob)}
                    controls
                    className="w-full mb-4"
                  />
                  <div className="flex gap-4">
                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center gap-2"
                    >
                      <Upload size={20} />
                      {isUploading ? 'Uploading...' : 'Send to Teacher'}
                    </button>
                    <button
                      onClick={() => setAudioBlob(null)}
                      className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upload Status */}
        {uploadStatus && (
          <div className={`rounded-xl p-6 mb-6 flex items-start gap-4 ${
            uploadStatus.type === 'success' 
              ? 'bg-green-50 border-2 border-green-300' 
              : 'bg-red-50 border-2 border-red-300'
          }`}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="text-green-600" size={28} />
            ) : (
              <AlertCircle className="text-red-600" size={28} />
            )}
            <div>
              <p className={`font-semibold text-lg ${
                uploadStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {uploadStatus.message}
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-3">📚 How to use:</h3>
          <ol className="space-y-2 text-gray-700">
            <li>1️⃣ Select a word or phrase to practice</li>
            <li>2️⃣ Click "Listen" to hear how it sounds</li>
            <li>3️⃣ Click the microphone button to record</li>
            <li>4️⃣ Say the word clearly into your microphone</li>
            <li>5️⃣ Click "Stop" when you're done</li>
            <li>6️⃣ Listen to your recording</li>
            <li>7️⃣ Send it to your teacher for feedback!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
