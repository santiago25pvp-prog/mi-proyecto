import React, { useState } from 'react';
import { useRagChat } from '../../hooks/useRagChat';

export const ChatWindow = () => {
  const [input, setInput] = useState('');
  const { messages, loading, error, sendMessage } = useRagChat();

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ height: '400px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: '10px', textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <span style={{ padding: '5px 10px', borderRadius: '5px', backgroundColor: m.role === 'user' ? '#0070f3' : '#eee', color: m.role === 'user' ? '#fff' : '#000' }}>
              {m.content}
            </span>
          </div>
        ))}
      </div>
      {loading && <div>Thinking...</div>}
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      <div style={{ marginTop: '10px' }}>
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          style={{ width: '80%', padding: '5px' }}
        />
        <button onClick={handleSend} disabled={loading} style={{ width: '20%', padding: '5px' }}>Send</button>
      </div>
    </div>
  );
};
