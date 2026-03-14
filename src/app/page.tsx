'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

// Types
interface User {
  id: string
  username: string
  name?: string | null
}

interface AuthUser {
  id: string
  email: string
  name: string | null
  username?: string | null
}

interface ChatParticipantSummary {
  id: string
  username?: string | null
  name?: string | null
  role: string
}

interface ChatSummary {
  id: string
  type: 'GLOBAL' | 'DIRECT' | 'GROUP'
  title: string | null
  participants: ChatParticipantSummary[]
  lastMessage?: {
    id: string
    content: string
    createdAt: string
    senderId: string | null
    type: string
  } | null
}

function VideoTile({
  stream,
  muted = false,
  label,
}: {
  stream: MediaStream
  muted?: boolean
  label: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className="video-tile">
      <video ref={videoRef} autoPlay playsInline muted={muted} />
      <div className="video-label">{label}</div>
    </div>
  )
}

interface Message {
  id: string
  chatId?: string
  senderId?: string | null
  senderName?: string
  content: string
  timestamp: Date | string
  type: 'user' | 'system' | 'bot'
}

// Styles
const styles = `
  :root {
    --primary-color: #6a11cb;
    --secondary-color: #2575fc;
    --accent-color: #ff3366;
    --text-color: #333;
    --bg-color: #f8f9fa;
    --card-bg: #ffffff;
    --border-color: #e0e0e0;
    --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  [data-theme="dark"] {
    --primary-color: #8e44ad;
    --secondary-color: #3498db;
    --accent-color: #e74c3c;
    --text-color: #f8f9fa;
    --bg-color: #121212;
    --card-bg: #1e1e1e;
    --border-color: #333333;
    --shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  body {
    background-color: var(--bg-color);
    color: var(--text-color);
    transition: all 0.3s ease;
    overflow-x: hidden;
  }

  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 5%;
    background-color: var(--card-bg);
    box-shadow: var(--shadow);
    position: fixed;
    width: 100%;
    top: 0;
    z-index: 1000;
    transition: all 0.3s ease;
  }

  .logo {
    font-size: 2rem;
    font-weight: bold;
    background: linear-gradient(45deg, var(--primary-color), var(--secondary-color), var(--accent-color));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: colorChange 5s infinite alternate;
  }

  @keyframes colorChange {
    0% { background: linear-gradient(45deg, var(--primary-color), var(--secondary-color), var(--accent-color)); -webkit-background-clip: text; background-clip: text; }
    25% { background: linear-gradient(45deg, var(--accent-color), var(--primary-color), var(--secondary-color)); -webkit-background-clip: text; background-clip: text; }
    50% { background: linear-gradient(45deg, var(--secondary-color), var(--accent-color), var(--primary-color)); -webkit-background-clip: text; background-clip: text; }
    75% { background: linear-gradient(45deg, var(--primary-color), var(--accent-color), var(--secondary-color)); -webkit-background-clip: text; background-clip: text; }
    100% { background: linear-gradient(45deg, var(--secondary-color), var(--primary-color), var(--accent-color)); -webkit-background-clip: text; background-clip: text; }
  }

  .nav-links {
    display: flex;
    list-style: none;
    gap: 0.5rem;
  }

  .nav-links li a {
    color: var(--text-color);
    text-decoration: none;
    font-weight: 500;
    transition: all 0.3s ease;
    position: relative;
    padding: 0.5rem 1rem;
    border-radius: 8px;
  }

  .nav-links li a:hover,
  .nav-links li a.active {
    color: var(--primary-color);
    background-color: rgba(106, 17, 203, 0.1);
  }

  .nav-links li a::after {
    content: '';
    position: absolute;
    width: 0;
    height: 2px;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--primary-color);
    transition: width 0.3s ease;
  }

  .nav-links li a:hover::after,
  .nav-links li a.active::after {
    width: 60%;
  }

  .theme-toggle {
    display: flex;
    align-items: center;
  }

  .switch {
    font-size: 17px;
    position: relative;
    display: inline-block;
    width: 3.5em;
    height: 2em;
    transform-style: preserve-3d;
    perspective: 500px;
    animation: toggle__animation 3s infinite;
  }

  .switch::before {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    filter: blur(20px);
    z-index: -1;
    border-radius: 50px;
    background-color: #d8ff99;
    background-image: radial-gradient(at 21% 46%, hsla(183,65%,60%,1) 0px, transparent 50%),
      radial-gradient(at 23% 25%, hsla(359,74%,70%,1) 0px, transparent 50%),
      radial-gradient(at 20% 1%, hsla(267,83%,75%,1) 0px, transparent 50%),
      radial-gradient(at 86% 87%, hsla(204,69%,68%,1) 0px, transparent 50%),
      radial-gradient(at 99% 41%, hsla(171,72%,77%,1) 0px, transparent 50%),
      radial-gradient(at 55% 24%, hsla(138,60%,62%,1) 0px, transparent 50%);
  }

  .switch input { opacity: 0; width: 0; height: 0; }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #fdfefedc;
    transition: .4s;
    border-radius: 30px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 1.4em;
    width: 1.4em;
    left: 0.3em;
    bottom: 0.35em;
    transition: .4s;
    border-radius: 50%;
    box-shadow: rgba(0, 0, 0, 0.17) 0px -10px 10px 0px inset, rgba(0, 0, 0, 0.09) 0px -1px 15px -8px;
    background-color: #ff99fd;
    background-image: radial-gradient(at 81% 39%, hsla(327,79%,79%,1) 0px, transparent 50%),
      radial-gradient(at 11% 72%, hsla(264,64%,79%,1) 0px, transparent 50%),
      radial-gradient(at 23% 20%, hsla(75,98%,71%,1) 0px, transparent 50%);
  }

  input:checked + .slider { background-color: #17202A; }
  input:checked + .slider:before { transform: translateX(1.5em); }

  @keyframes toggle__animation {
    0%, 100% { transform: translateY(-10px) rotateX(15deg) rotateY(-20deg); }
    50% { transform: translateY(0px) rotateX(15deg) rotateY(-20deg); }
  }

  .main-content {
    margin-top: 80px;
    min-height: calc(100vh - 80px);
  }

  .section {
    display: none;
    padding: 2rem 5%;
    animation: fadeIn 0.5s ease;
  }

  .section.active {
    display: block;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .home-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    min-height: calc(100vh - 160px);
  }

  .home-title {
    font-size: 3.5rem;
    margin-bottom: 1rem;
    background: linear-gradient(45deg, var(--primary-color), var(--secondary-color), var(--accent-color));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: colorChange 5s infinite alternate;
  }

  .home-subtitle {
    font-size: 1.5rem;
    margin-bottom: 2rem;
    color: var(--text-color);
  }

  .home-buttons {
    display: flex;
    gap: 1.5rem;
    margin-top: 2rem;
  }

  .btn {
    padding: 0.8rem 2rem;
    border: none;
    border-radius: 50px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: inline-block;
    position: relative;
    overflow: hidden;
    z-index: 1;
  }

  .btn-primary {
    background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
    color: white;
    box-shadow: 0 4px 15px rgba(106, 17, 203, 0.4);
  }

  .btn-secondary {
    background: linear-gradient(45deg, var(--accent-color), var(--primary-color));
    color: white;
    box-shadow: 0 4px 15px rgba(255, 51, 102, 0.4);
  }

  .btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  }

  .btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.2);
    transform: translateX(-100%);
    transition: transform 0.6s;
    z-index: -1;
  }

  .btn:hover::before {
    transform: translateX(0);
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 3rem;
    max-width: 1200px;
  }

  .feature-card {
    background-color: var(--card-bg);
    border-radius: 15px;
    padding: 2rem;
    box-shadow: var(--shadow);
    transition: all 0.3s ease;
    text-align: center;
  }

  .feature-card:hover {
    transform: translateY(-10px);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
  }

  .feature-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .feature-title {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: var(--text-color);
  }

  .feature-description {
    color: var(--text-color);
    opacity: 0.8;
  }

  .login-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 160px);
  }

  .login-container {
    position: relative;
    perspective: 1000px;
    width: 300px;
    margin-bottom: 2rem;
  }

  .login-card {
    position: relative;
    width: 100%;
    height: 80px;
    background: linear-gradient(135deg, #ff3366, #ff6b35);
    border: 4px solid #000;
    box-shadow: 8px 8px 0 #000, 16px 16px 0 rgba(255, 51, 102, 0.3);
    cursor: pointer;
    overflow: hidden;
    transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    transform-style: preserve-3d;
  }

  .login-card:hover,
  .login-card.expanded {
    height: 300px;
    transform: translateZ(20px) rotateX(5deg) rotateY(-5deg);
    box-shadow: 12px 12px 0 #000, 24px 24px 0 rgba(255, 51, 102, 0.4), 0 0 50px rgba(255, 51, 102, 0.6);
  }

  .login-title {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: inherit;
    transition: all 0.4s ease;
  }

  .login-text {
    color: #000;
    font-weight: 800;
    font-size: 16px;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-shadow: 2px 2px 0 rgba(255, 255, 255, 0.3);
    transition: all 0.4s ease;
  }

  .login-card:hover .login-text,
  .login-card.expanded .login-text {
    opacity: 0;
    transform: translateY(-30px) scale(0.8);
  }

  .login-form {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
    opacity: 0;
    transform: translateY(30px) scale(0.8);
    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .login-card:hover .login-form,
  .login-card.expanded .login-form {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .input-group {
    position: relative;
    width: 100%;
    margin-bottom: 20px;
  }

  .login-input {
    width: 100%;
    padding: 12px 10px;
    background: rgba(255, 255, 255, 0.8);
    border: 3px solid #000;
    font-weight: 700;
    color: #000;
    box-shadow: 4px 4px 0 #000;
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  .login-input:focus {
    outline: none;
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 #000;
  }

  .login-input::placeholder {
    color: #000;
    opacity: 0.6;
  }

  .login-btn {
    width: 100%;
    padding: 12px;
    background: #000;
    color: #fff;
    border: none;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    cursor: pointer;
    box-shadow: 4px 4px 0 rgba(255, 255, 255, 0.3);
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  .login-btn:hover {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 rgba(255, 255, 255, 0.3);
    background: #333;
  }

  .auth-error {
    width: 100%;
    margin: 0 0 10px;
    padding: 8px 10px;
    border-radius: 6px;
    background: #ef4444;
    color: #fff;
    font-size: 0.8rem;
    text-align: center;
    font-weight: 600;
  }

  .auth-toggle {
    margin-top: 10px;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 0.8rem;
    text-decoration: underline;
    cursor: pointer;
  }

  .login-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    transition: left 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .login-card:hover::before,
  .login-card.expanded::before {
    left: 100%;
  }

  .login-card::after {
    content: "";
    position: absolute;
    top: -4px;
    right: -4px;
    width: 20px;
    height: 20px;
    background: #000;
    clip-path: polygon(0 0, 100% 0, 100% 100%);
    transition: all 0.6s ease;
  }

  .login-card:hover::after,
  .login-card.expanded::after {
    transform: scale(1) rotate(0deg);
    background: rgb(246, 168, 116);
  }

  .chat-container {
    display: flex;
    height: calc(100vh - 160px);
    max-width: 1200px;
    margin: 0 auto;
    background-color: var(--card-bg);
    border-radius: 15px;
    box-shadow: var(--shadow);
    overflow: hidden;
  }

  .chat-sidebar {
    width: 280px;
    background-color: var(--bg-color);
    padding: 1.5rem;
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
  }

  .chat-search {
    position: relative;
    margin-bottom: 1.5rem;
  }

  .chat-search input {
    width: 100%;
    padding: 0.8rem;
    border-radius: 50px;
    border: 1px solid var(--border-color);
    background-color: var(--card-bg);
    color: var(--text-color);
    padding-left: 2.5rem;
  }

  .chat-search i {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-color);
    opacity: 0.7;
  }

  .chat-list {
    flex: 1;
    overflow-y: auto;
  }

  .chat-item {
    display: flex;
    align-items: center;
    padding: 1rem;
    border-radius: 10px;
    margin-bottom: 0.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .chat-item:hover {
    background-color: var(--bg-color);
  }

  .chat-item.active {
    background-color: var(--bg-color);
    border-left: 3px solid var(--primary-color);
  }

  .chat-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 1rem;
    background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    flex-shrink: 0;
  }

  .chat-info {
    flex: 1;
    overflow: hidden;
  }

  .chat-name {
    font-weight: 600;
    margin-bottom: 0.2rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chat-preview {
    font-size: 0.9rem;
    opacity: 0.7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chat-time {
    font-size: 0.8rem;
    opacity: 0.5;
    flex-shrink: 0;
  }

  .user-list {
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px dashed var(--border-color);
  }

  .user-list-title {
    font-size: 0.85rem;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    opacity: 0.6;
    margin: 0 0 0.5rem 0.2rem;
  }

  .chat-section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 1rem 0 0.5rem;
    font-size: 0.85rem;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    opacity: 0.7;
  }

  .chat-action {
    border: none;
    background: rgba(106, 17, 203, 0.15);
    color: var(--primary-color);
    padding: 0.3rem 0.6rem;
    border-radius: 999px;
    font-size: 0.7rem;
    cursor: pointer;
  }

  .chat-action:hover {
    background: rgba(106, 17, 203, 0.25);
  }

  .user-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.7rem;
    border-radius: 10px;
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .user-item:hover {
    background-color: var(--bg-color);
  }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 0.9rem;
    flex-shrink: 0;
    background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
  }

  .user-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .user-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-id {
    font-size: 0.78rem;
    opacity: 0.6;
    word-break: break-all;
    font-family: Consolas, 'Courier New', monospace;
  }

  .chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .chat-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    background-color: var(--card-bg);
  }

  .chat-header-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 1rem;
    background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
  }

  .chat-header-info {
    flex: 1;
  }

  .chat-header-name {
    font-weight: 600;
    margin-bottom: 0.2rem;
  }

  .chat-header-status {
    font-size: 0.9rem;
    opacity: 0.7;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #22c55e;
  }

  .status-dot.offline {
    background-color: #9ca3af;
  }

  .chat-header-actions {
    display: flex;
    gap: 1rem;
  }

  .chat-header-actions button {
    background: none;
    border: none;
    color: var(--text-color);
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.3s ease;
    padding: 0.5rem;
    border-radius: 8px;
  }

  .chat-header-actions button:hover {
    color: var(--primary-color);
    background-color: rgba(106, 17, 203, 0.1);
  }

  .chat-messages {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background-color: var(--bg-color);
  }

  .message {
    max-width: 70%;
    padding: 1rem;
    border-radius: 15px;
    position: relative;
    animation: messageSlide 0.3s ease;
    word-wrap: break-word;
  }

  .message-sender {
    font-size: 0.75rem;
    font-weight: 600;
    opacity: 0.7;
    margin-bottom: 0.35rem;
  }

  @keyframes messageSlide {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .message.sent {
    align-self: flex-end;
    background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
    color: white;
    border-bottom-right-radius: 5px;
  }

  .message.received {
    align-self: flex-start;
    background-color: var(--card-bg);
    color: var(--text-color);
    border-bottom-left-radius: 5px;
  }

  .message.bot {
    align-self: flex-start;
    background: linear-gradient(45deg, var(--accent-color), var(--primary-color));
    color: white;
    border-bottom-left-radius: 5px;
  }

  .message.system {
    align-self: center;
    background-color: transparent;
    color: var(--text-color);
    opacity: 0.7;
    font-style: italic;
    font-size: 0.9rem;
    max-width: 100%;
    padding: 0.5rem 1rem;
  }

  .message-time {
    font-size: 0.7rem;
    opacity: 0.7;
    margin-top: 0.3rem;
    text-align: right;
  }

  .message.received .message-time,
  .message.bot .message-time {
    text-align: left;
  }

  .chat-input {
    padding: 1.5rem;
    border-top: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 1rem;
    background-color: var(--card-bg);
  }

  .chat-input input {
    flex: 1;
    padding: 0.8rem 1.5rem;
    border-radius: 50px;
    border: 1px solid var(--border-color);
    background-color: var(--bg-color);
    color: var(--text-color);
    font-size: 1rem;
    transition: all 0.3s ease;
  }

  .chat-input input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(106, 17, 203, 0.1);
  }

  .chat-input button {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    border: none;
    background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chat-input button:hover {
    transform: scale(1.1);
  }

  .chat-input button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .ai-chat-btn {
    position: fixed;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    color: white;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    transition: all 0.3s ease;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ai-chat-btn {
    bottom: 30px;
    right: 30px;
    background: linear-gradient(45deg, var(--secondary-color), var(--accent-color));
    box-shadow: 0 4px 15px rgba(37, 117, 252, 0.4);
  }

  .ai-chat-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(37, 117, 252, 0.6);
  }

  .typing-indicator {
    display: flex;
    align-items: center;
    padding: 0.8rem 1rem;
    background-color: var(--card-bg);
    border-radius: 15px;
    border-bottom-left-radius: 5px;
    max-width: 70px;
  }

  .typing-indicator span {
    height: 8px;
    width: 8px;
    background-color: var(--text-color);
    border-radius: 50%;
    display: inline-block;
    margin: 0 2px;
    opacity: 0.4;
  }

  .typing-indicator span:nth-child(1) { animation: typing 1.5s infinite; }
  .typing-indicator span:nth-child(2) { animation: typing 1.5s infinite 0.2s; }
  .typing-indicator span:nth-child(3) { animation: typing 1.5s infinite 0.4s; }

  @keyframes typing {
    0% { transform: translateY(0); opacity: 0.4; }
    50% { transform: translateY(-10px); opacity: 0.8; }
    100% { transform: translateY(0); opacity: 0.4; }
  }

  .info-container {
    max-width: 800px;
    margin: 0 auto;
    background-color: var(--card-bg);
    border-radius: 15px;
    box-shadow: var(--shadow);
    padding: 2rem;
  }

  .info-title {
    font-size: 2rem;
    margin-bottom: 1.5rem;
    color: var(--text-color);
    text-align: center;
  }

  .info-content {
    line-height: 1.6;
    color: var(--text-color);
  }

  .info-content p {
    margin-bottom: 1rem;
  }

  .about-developer {
    margin-top: 2rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
    position: relative;
    isolation: isolate;
    overflow: hidden;
    background: linear-gradient(135deg, rgba(106, 17, 203, 0.08), rgba(37, 117, 252, 0.08));
    border: 1px solid rgba(106, 17, 203, 0.25);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: var(--shadow), 0 12px 30px rgba(37, 117, 252, 0.12);
    transform-style: preserve-3d;
    animation: devFloat 6s ease-in-out infinite;
    transition: transform 0.5s ease, box-shadow 0.5s ease;
  }

  .about-developer::before {
    content: '';
    position: absolute;
    inset: -40%;
    background: conic-gradient(
      from 180deg at 50% 50%,
      rgba(106, 17, 203, 0.45),
      rgba(37, 117, 252, 0.45),
      rgba(255, 51, 102, 0.45),
      rgba(106, 17, 203, 0.45)
    );
    filter: blur(28px);
    opacity: 0.35;
    z-index: -2;
    animation: devHalo 14s linear infinite;
  }

  .about-developer::after {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 11px;
    background: radial-gradient(120px 80px at 12% 20%, rgba(255, 255, 255, 0.3), transparent 60%);
    opacity: 0.6;
    z-index: -1;
    pointer-events: none;
  }

  .about-developer:hover {
    transform: translateY(-6px) rotateX(2deg) rotateY(-2deg);
    box-shadow: 0 18px 40px rgba(37, 117, 252, 0.22), 0 0 0 1px rgba(106, 17, 203, 0.35);
  }

  @keyframes devFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }

  @keyframes devHalo {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .about-photo {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid var(--primary-color);
    box-shadow: var(--shadow);
  }

  .about-dev-text h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.2rem;
  }

  .about-dev-text .dev-title {
    font-weight: 600;
    color: var(--secondary-color);
    margin-bottom: 0.5rem;
  }

  @media (max-width: 600px) {
    .about-developer {
      justify-content: center;
      text-align: center;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .about-developer,
    .about-developer::before {
      animation: none;
    }
  }

  .contact-form {
    margin-top: 2rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.8rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background-color: var(--bg-color);
    color: var(--text-color);
    font-size: 1rem;
    transition: all 0.3s ease;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(106, 17, 203, 0.1);
  }

  .form-group textarea {
    resize: vertical;
    min-height: 150px;
  }

  .help-list {
    list-style: none;
    margin-top: 1.5rem;
    padding: 0;
  }

  .help-item {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background-color: var(--bg-color);
    border-radius: 10px;
    border-left: 3px solid var(--primary-color);
  }

  .help-question {
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .notification {
    position: fixed;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    padding: 1rem 2rem;
    border-radius: 50px;
    color: white;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    animation: fadeIn 0.5s ease;
  }

  .online-users {
    padding: 1rem;
    border-top: 1px solid var(--border-color);
    font-size: 0.9rem;
    opacity: 0.7;
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
  }

  .connection-status .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .connection-status .dot.connected { background-color: #22c55e; }
  .connection-status .dot.disconnected { background-color: #ef4444; }

  .video-panel {
    display: grid;
    gap: 12px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.6);
    border-bottom: 1px solid var(--border-color);
  }

  .video-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .video-tile {
    position: relative;
    background: #000;
    border-radius: 12px;
    overflow: hidden;
    min-height: 160px;
  }

  .video-tile video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-label {
    position: absolute;
    bottom: 8px;
    left: 8px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 0.75rem;
    padding: 4px 8px;
    border-radius: 999px;
  }

  .call-controls {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .call-btn {
    border: none;
    padding: 8px 14px;
    border-radius: 999px;
    font-weight: 600;
    cursor: pointer;
  }

  .call-btn.primary {
    background: var(--secondary-color);
    color: #fff;
  }

  .call-btn.danger {
    background: #ef4444;
    color: #fff;
  }

  .call-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
  }

  .call-modal-card {
    width: min(480px, 92vw);
    background: var(--card-bg);
    border-radius: 16px;
    padding: 20px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .call-modal-card h3 {
    margin: 0;
  }

  .call-option {
    display: flex;
    gap: 10px;
  }

  .call-option button {
    flex: 1;
    padding: 10px;
    border-radius: 10px;
    border: 2px solid transparent;
    background: var(--bg-color);
    color: var(--text-color);
    font-weight: 600;
    cursor: pointer;
  }

  .call-option button.active {
    border-color: var(--secondary-color);
    background: rgba(37, 117, 252, 0.15);
  }

  .call-input {
    width: 100%;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-color);
    color: var(--text-color);
  }

  .call-error {
    color: #ef4444;
    font-size: 0.85rem;
  }

  @media (max-width: 768px) {
    .navbar { padding: 1rem 3%; }
    .nav-links { display: none; }
    .home-title { font-size: 2.5rem; }
    .home-subtitle { font-size: 1.2rem; }
    .home-buttons { flex-direction: column; width: 100%; max-width: 300px; }
    .chat-container { flex-direction: column; height: auto; min-height: calc(100vh - 160px); }
    .chat-sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--border-color); max-height: 200px; }
    .message { max-width: 90%; }
    .ai-chat-btn { right: 30px; bottom: 100px; }
  }
`

export default function GetSpeak() {
  // Theme - use lazy initialization
  const [isDark, setIsDark] = useState(false)

  // Navigation
  const [activeSection, setActiveSection] = useState('home')

  // User
  const [username, setUsername] = useState('')
  const sessionIdRef = useRef<string | null>(null)
  const hasJoinedRef = useRef(false)
  const canReceiveRef = useRef(false)

  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authError, setAuthError] = useState<string | null>(null)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')

  const [isCallModalOpen, setIsCallModalOpen] = useState(false)
  const [callMode, setCallMode] = useState<'1to1' | 'group'>('1to1')
  const [roomId, setRoomId] = useState('')
  const [callError, setCallError] = useState<string | null>(null)
  const [callActive, setCallActive] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Array<{ id: string; stream: MediaStream }>>([])
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())

  // Socket - use ref for socket instance
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])

  // Chat
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [currentChatType, setCurrentChatType] = useState<'global' | 'direct' | 'group' | 'ai'>('global')
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isChatsLoading, setIsChatsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  // AI Chat history
  const [aiChatHistory, setAiChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const activeChatIdRef = useRef<string | null>(null)
  const currentChatTypeRef = useRef<'global' | 'direct' | 'group' | 'ai'>('global')

  const logSessionStart = useCallback(async (name: string, userId?: string) => {
    if (!name || sessionIdRef.current) return
    try {
      const response = await fetch('/api/sessions/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, userId }),
      })
      if (!response.ok) return
      const data = await response.json()
      if (data?.sessionId) {
        sessionIdRef.current = data.sessionId
      }
    } catch (error) {
      console.error('Failed to log session start', error)
    }
  }, [])

  const logSessionEnd = useCallback(async () => {
    const sessionId = sessionIdRef.current
    if (!sessionId) return
    sessionIdRef.current = null
    try {
      await fetch('/api/sessions/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
        keepalive: true,
      })
    } catch (error) {
      console.error('Failed to log session end', error)
    }
  }, [])

  const loadChats = useCallback(async () => {
    if (!authUser) return
    setIsChatsLoading(true)
    try {
      const response = await fetch('/api/chats')
      if (!response.ok) return
      const data = await response.json()
      const nextChats: ChatSummary[] = data?.chats ?? []
      setChats(nextChats)

      if (!activeChatId || !nextChats.find(chat => chat.id === activeChatId)) {
        const globalChat = nextChats.find(chat => chat.type === 'GLOBAL')
        if (globalChat) {
          setActiveChatId(globalChat.id)
          setCurrentChatType('global')
        } else {
          setActiveChatId(null)
        }
      }
    } catch (error) {
      console.error('Failed to load chats', error)
    } finally {
      setIsChatsLoading(false)
    }
  }, [activeChatId, authUser])

  const loadMessages = useCallback(async (chatId: string) => {
    if (!chatId) return
    try {
      const response = await fetch(`/api/chats/${chatId}/messages?limit=50`)
      if (!response.ok) return
      const data = await response.json()
      const loaded = Array.isArray(data?.messages) ? data.messages : []
      const mapped: Message[] = loaded
        .slice()
        .reverse()
        .map((msg: any) => ({
          id: msg.id,
          chatId,
          senderId: msg.sender?.id ?? null,
          senderName: msg.sender?.name || msg.sender?.username || 'Unknown',
          content: msg.content,
          timestamp: msg.createdAt,
          type: msg.type === 'SYSTEM' ? 'system' : 'user',
        }))
      setMessages(mapped)
    } catch (error) {
      console.error('Failed to load messages', error)
    }
  }, [])

  const getChatDisplayName = useCallback(
    (chat: ChatSummary | null) => {
      if (!chat) return 'Chat'
      if (chat.type === 'GLOBAL') return 'Global Chat'
      if (chat.type === 'DIRECT') {
        const other = chat.participants.find(p => p.id !== authUser?.id)
        return other?.name || other?.username || 'Direct Chat'
      }
      return chat.title || 'Group Chat'
    },
    [authUser]
  )

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const handleBeforeUnload = () => {
      void logSessionEnd()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [logSessionEnd])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    activeChatIdRef.current = activeChatId
  }, [activeChatId])

  useEffect(() => {
    currentChatTypeRef.current = currentChatType
  }, [currentChatType])

  useEffect(() => {
    let active = true
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (!response.ok) {
          if (active) {
            setAuthUser(null)
            setAuthLoading(false)
          }
          return
        }
        const data = await response.json()
        if (active) {
          setAuthUser(data?.user ?? null)
        }
      } catch (error) {
        if (active) {
          setAuthUser(null)
        }
      } finally {
        if (active) {
          setAuthLoading(false)
        }
      }
    }
    void loadUser()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!authUser) {
      setChats([])
      setActiveChatId(null)
      return
    }
    void loadChats()
  }, [authUser, loadChats])

  useEffect(() => {
    if (!activeChatId || currentChatType === 'ai') return
    void loadMessages(activeChatId)
  }, [activeChatId, currentChatType, loadMessages])

  useEffect(() => {
    canReceiveRef.current = Boolean(authUser && isConnected)
    if (!authUser) {
      setUsername('')
      hasJoinedRef.current = false
      return
    }
    const displayName = authUser.name || authUser.email
    setUsername(displayName)
  }, [authUser, isConnected])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
    const shouldDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    setIsDark(Boolean(shouldDark))
    document.body.setAttribute('data-theme', shouldDark ? 'dark' : 'light')
  }, [])

  // Toggle theme
  const toggleTheme = () => {
    setIsDark(!isDark)
    if (!isDark) {
      document.body.setAttribute('data-theme', 'dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.body.setAttribute('data-theme', 'light')
      localStorage.setItem('theme', 'light')
    }
  }

  const handleLogin = async () => {
    setAuthError(null)
    if (!loginEmail.trim() || !loginPassword) {
      setAuthError('Email and password are required.')
      return
    }
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      })
      const data = await response.json()
      if (!response.ok) {
        setAuthError(data?.error || 'Login failed.')
        return
      }
      setAuthUser(data.user)
      setLoginPassword('')
      setActiveSection('chat')
    } catch (error) {
      setAuthError('Login failed.')
    }
  }

  const handleRegister = async () => {
    setAuthError(null)
    if (!registerEmail.trim() || !registerPassword) {
      setAuthError('Email and password are required.')
      return
    }
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerEmail.trim(),
          password: registerPassword,
          name: registerName.trim(),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setAuthError(data?.error || 'Registration failed.')
        return
      }
      setAuthUser(data.user)
      setRegisterPassword('')
      setActiveSection('chat')
    } catch (error) {
      setAuthError('Registration failed.')
    }
  }

  const handleLogout = async () => {
    setAuthError(null)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Failed to logout', error)
    }
    void logSessionEnd()
    socketRef.current?.emit('logout')
    cleanupCall()
    setAuthUser(null)
    setMessages([])
    setOnlineUsers([])
    setChats([])
    setActiveChatId(null)
    setCurrentChatType('global')
    setActiveSection('login')
    setAuthMode('login')
  }

  const cleanupCall = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()
    setRemoteStreams([])
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    setLocalStream(null)
    setCallActive(false)
  }, [])

  const createPeerConnection = useCallback(
    (peerId: string, isInitiator: boolean) => {
      const existing = peerConnectionsRef.current.get(peerId)
      if (existing) return existing

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      })

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current as MediaStream)
        })
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('webrtc-ice-candidate', {
            to: peerId,
            candidate: event.candidate,
          })
        }
      }

      pc.ontrack = (event) => {
        const [stream] = event.streams
        setRemoteStreams((prev) => {
          if (prev.find((item) => item.id === peerId)) return prev
          return [...prev, { id: peerId, stream }]
        })
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          pc.close()
          peerConnectionsRef.current.delete(peerId)
          setRemoteStreams((prev) => prev.filter((item) => item.id !== peerId))
        }
      }

      peerConnectionsRef.current.set(peerId, pc)

      if (isInitiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            if (!socketRef.current || !pc.localDescription) return
            socketRef.current.emit('webrtc-offer', {
              to: peerId,
              offer: pc.localDescription,
            })
          })
          .catch(() => {})
      }

      return pc
    },
    []
  )

  const startCall = useCallback(async () => {
    setCallError(null)
    if (!authUser) {
      setCallError('Login required.')
      return
    }
    if (!roomId.trim()) {
      setCallError('Room code is required.')
      return
    }
    if (!socketRef.current) {
      setCallError('Socket not connected.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      setLocalStream(stream)
      setCallActive(true)
      setIsCallModalOpen(false)
      socketRef.current.emit('join-room', { roomId: roomId.trim(), mode: callMode })
    } catch (error) {
      setCallError('Could not access camera/microphone.')
    }
  }, [authUser, callMode, roomId])

  const endCall = useCallback(() => {
    if (socketRef.current && roomId.trim()) {
      socketRef.current.emit('leave-room', { roomId: roomId.trim() })
    }
    cleanupCall()
  }, [cleanupCall, roomId])

  const createRoomCode = () => {
    const code = Math.random().toString(36).slice(2, 8)
    setRoomId(code)
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {})
    }
  }

  // Initialize socket connection
  useEffect(() => {
    // Connect directly to the socket server on port 3003
    // Using window.location.hostname to get the current host
    const envSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
    const socketUrl =
      envSocketUrl ??
      (typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:3003`
        : 'http://localhost:3003')
    
    console.log('Connecting to socket server:', socketUrl)
    
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      withCredentials: true
    })

    socketRef.current = socketInstance

    const handleConnect = () => {
      setIsConnected(true)
      console.log('Connected to socket server')
    }

    const handleDisconnect = () => {
      setIsConnected(false)
      hasJoinedRef.current = false
      canReceiveRef.current = false
      console.log('Disconnected from socket server')
      cleanupCall()
      void logSessionEnd()
    }

    const handleChatMessage = (payload: {
      chatId: string
      message: {
        id: string
        content: string
        createdAt: string
        type: string
        sender?: { id: string; username?: string | null; name?: string | null } | null
      }
    }) => {
      if (!canReceiveRef.current) return
      if (!payload?.chatId || payload.chatId !== activeChatIdRef.current) return
      const msg: Message = {
        id: payload.message.id,
        chatId: payload.chatId,
        senderId: payload.message.sender?.id ?? null,
        senderName:
          payload.message.sender?.name ||
          payload.message.sender?.username ||
          'Unknown',
        content: payload.message.content,
        timestamp: payload.message.createdAt,
        type: payload.message.type === 'SYSTEM' ? 'system' : 'user'
      }
      setMessages(prev => [...prev, msg])
      setChats(prev => {
        const updated = prev.map(chat =>
          chat.id === payload.chatId
            ? {
                ...chat,
                lastMessage: {
                  id: payload.message.id,
                  content: payload.message.content,
                  createdAt: payload.message.createdAt,
                  senderId: payload.message.sender?.id ?? null,
                  type: payload.message.type
                }
              }
            : chat
        )
        const moved = updated.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt
            ? new Date(a.lastMessage.createdAt).getTime()
            : 0
          const bTime = b.lastMessage?.createdAt
            ? new Date(b.lastMessage.createdAt).getTime()
            : 0
          return bTime - aTime
        })
        return moved
      })
    }

      const handleUserJoined = (data: { user: User; message?: { content: string } }) => {
        if (canReceiveRef.current && currentChatTypeRef.current === 'global') {
          const displayName = data.user.username || data.user.name || 'Someone'
          setMessages(prev => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              content: data.message?.content || `${displayName} joined.`,
              timestamp: new Date(),
              type: 'system'
            }
          ])
        }
        setOnlineUsers(prev => {
          if (!prev.find(u => u.id === data.user.id)) {
            return [...prev, data.user]
          }
          return prev
        })
      }

      const handleUserLeft = (data: { user: User; message?: { content: string } }) => {
        if (canReceiveRef.current && currentChatTypeRef.current === 'global') {
          const displayName = data.user.username || data.user.name || 'Someone'
          setMessages(prev => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              content: data.message?.content || `${displayName} left.`,
              timestamp: new Date(),
              type: 'system'
            }
          ])
        }
        setOnlineUsers(prev => prev.filter(u => u.id !== data.user.id))
      }

      const handleUsersList = (data: { users: User[] }) => {
        setOnlineUsers(data.users)
      }

    const handleRoomPeers = (data: { peers: string[] }) => {
      if (!callActive || !socketRef.current) return
      data.peers.forEach((peerId) => {
        createPeerConnection(peerId, true)
      })
    }

    const handlePeerJoined = (data: { peerId: string }) => {
      if (!callActive) return
      // Wait for the new peer to initiate offers
      createPeerConnection(data.peerId, false)
    }

    const handlePeerLeft = (data: { peerId: string }) => {
      const pc = peerConnectionsRef.current.get(data.peerId)
      if (pc) pc.close()
      peerConnectionsRef.current.delete(data.peerId)
      setRemoteStreams((prev) => prev.filter((item) => item.id !== data.peerId))
    }

    const handleOffer = async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
      if (!callActive) return
      const pc = createPeerConnection(data.from, false)
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socketRef.current?.emit('webrtc-answer', { to: data.from, answer })
    }

    const handleAnswer = async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peerConnectionsRef.current.get(data.from)
      if (!pc) return
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer))
    }

    const handleIceCandidate = async (data: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerConnectionsRef.current.get(data.from)
      if (!pc) return
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
    }

    socketInstance.on('connect', handleConnect)
    socketInstance.on('disconnect', handleDisconnect)
    socketInstance.on('chat-message', handleChatMessage)
    socketInstance.on('user-joined', handleUserJoined)
    socketInstance.on('user-left', handleUserLeft)
    socketInstance.on('users-list', handleUsersList)
    socketInstance.on('room-peers', handleRoomPeers)
    socketInstance.on('peer-joined', handlePeerJoined)
    socketInstance.on('peer-left', handlePeerLeft)
    socketInstance.on('webrtc-offer', handleOffer)
    socketInstance.on('webrtc-answer', handleAnswer)
    socketInstance.on('webrtc-ice-candidate', handleIceCandidate)

    return () => {
      socketInstance.off('connect', handleConnect)
      socketInstance.off('disconnect', handleDisconnect)
      socketInstance.off('chat-message', handleChatMessage)
      socketInstance.off('user-joined', handleUserJoined)
      socketInstance.off('user-left', handleUserLeft)
      socketInstance.off('users-list', handleUsersList)
      socketInstance.off('room-peers', handleRoomPeers)
      socketInstance.off('peer-joined', handlePeerJoined)
      socketInstance.off('peer-left', handlePeerLeft)
      socketInstance.off('webrtc-offer', handleOffer)
      socketInstance.off('webrtc-answer', handleAnswer)
      socketInstance.off('webrtc-ice-candidate', handleIceCandidate)
      socketInstance.disconnect()
    }
  }, [callActive, createPeerConnection, cleanupCall, logSessionEnd])

    useEffect(() => {
      if (!authUser || !isConnected || !socketRef.current) return
      if (hasJoinedRef.current) return
      const displayName = authUser.name || authUser.email
      socketRef.current.emit('join', { username: displayName })
      hasJoinedRef.current = true
      setOnlineUsers(prev => {
        if (prev.find(u => u.id === authUser.id)) return prev
        return [
          ...prev,
          {
            id: authUser.id,
            username: authUser.username || displayName,
            name: authUser.name
          }
        ]
      })
      void logSessionStart(displayName, authUser.id)
    }, [authUser, isConnected, logSessionStart])

  useEffect(() => {
    if (!socketRef.current || !isConnected) return
    if (!activeChatId || currentChatType === 'ai') return
    socketRef.current.emit('join-chat', { chatId: activeChatId })
    return () => {
      socketRef.current?.emit('leave-chat', { chatId: activeChatId })
    }
  }, [activeChatId, currentChatType, isConnected])

  // Send message
  const sendMessage = async () => {
    if (!inputMessage.trim()) return
    if (!authUser) return

    if (currentChatType === 'ai') {
      // Send to AI chat
      const userMessage: Message = {
        id: Date.now().toString(),
        senderId: authUser.id,
        senderName: username || 'You',
        content: inputMessage.trim(),
        timestamp: new Date(),
        type: 'user'
      }
      setMessages(prev => [...prev, userMessage])
      
      // Add to AI chat history
      const newHistory = [...aiChatHistory, { role: 'user' as const, content: inputMessage.trim() }]
      setAiChatHistory(newHistory)
      
      setIsTyping(true)
      
      try {
        const response = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: inputMessage.trim(),
            history: newHistory.slice(-10) // Keep last 10 messages for context
          })
        })
        
        const data = await response.json()

        setIsTyping(false)

        if (!response.ok) {
          const errorText =
            data?.error || data?.details || 'Sorry, I could not generate a response.'
          const aiErrorMessage: Message = {
            id: (Date.now() + 1).toString(),
            senderName: 'AI Assistant',
            content: errorText,
            timestamp: new Date(),
            type: 'bot'
          }
          setMessages(prev => [...prev, aiErrorMessage])
          return
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          senderName: 'AI Assistant',
          content: data.response || 'Sorry, I could not generate a response.',
          timestamp: new Date(),
          type: 'bot'
        }
        setMessages(prev => [...prev, aiMessage])

        // Add to AI chat history
        setAiChatHistory(prev => [...prev, { role: 'assistant', content: data.response }])
      } catch (error) {
        setIsTyping(false)
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          senderName: 'AI Assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
          type: 'bot'
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } else {
      if (!activeChatId) return
      if (socketRef.current) {
        socketRef.current.emit('chat-message', {
          chatId: activeChatId,
          content: inputMessage.trim()
        })
      }
    }

    setInputMessage('')
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Switch to global chat
  const switchToGlobalChat = () => {
    setActiveSection('chat')
    setCurrentChatType('global')
    setAiChatHistory([])
    setMessages([])
    const globalChat = chats.find(chat => chat.type === 'GLOBAL')
    if (globalChat) {
      setActiveChatId(globalChat.id)
    } else {
      setActiveChatId(null)
      setMessages([
        {
          id: '1',
          senderName: 'System',
          content: 'Global chat is initializing. Please try again in a moment.',
          timestamp: new Date(),
          type: 'system'
        }
      ])
    }
  }

  // Switch to AI chat
  const switchToAIChat = () => {
    setActiveSection('chat')
    setCurrentChatType('ai')
    setActiveChatId(null)
    setMessages([
      {
        id: '1',
        senderName: 'AI Assistant',
        content: 'Hello! I am your AI assistant. How can I help you today?',
        timestamp: new Date(),
        type: 'bot'
      }
    ])
    setAiChatHistory([])
  }

  const switchToChat = (chat: ChatSummary) => {
    setActiveSection('chat')
    setMessages([])
    if (chat.type === 'GLOBAL') {
      setCurrentChatType('global')
    } else if (chat.type === 'DIRECT') {
      setCurrentChatType('direct')
    } else {
      setCurrentChatType('group')
    }
    setActiveChatId(chat.id)
    setAiChatHistory([])
  }

  const startDirectChat = async (targetId: string) => {
    if (!authUser) return
    if (targetId === authUser.id) {
      showNotification('You cannot message yourself.', '#ef4444')
      return
    }
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'direct', otherUserId: targetId })
      })
      const data = await response.json()
      if (!response.ok) {
        showNotification(data?.error || 'Failed to start chat.', '#ef4444')
        return
      }
      const chat: ChatSummary = data.chat
      setChats(prev => {
        const exists = prev.find(item => item.id === chat.id)
        if (exists) {
          return prev.map(item => (item.id === chat.id ? chat : item))
        }
        return [chat, ...prev]
      })
      switchToChat(chat)
    } catch (error) {
      showNotification('Failed to start chat.', '#ef4444')
    }
  }

  const createGroupChat = async () => {
    if (!authUser) return
    const title = window.prompt('Enter group name')
    if (!title) return
    const rawIds = window.prompt('Enter user IDs (comma separated)')
    if (!rawIds) return
    const participantIds = rawIds
      .split(',')
      .map(id => id.trim())
      .filter(Boolean)

    if (participantIds.length === 0) {
      showNotification('Please enter at least one user ID.', '#ef4444')
      return
    }

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'group', title, participantIds })
      })
      const data = await response.json()
      if (!response.ok) {
        showNotification(data?.error || 'Failed to create group.', '#ef4444')
        return
      }
      const chat: ChatSummary = data.chat
      setChats(prev => [chat, ...prev])
      switchToChat(chat)
    } catch (error) {
      showNotification('Failed to create group.', '#ef4444')
    }
  }

  const handleMoreOptions = async () => {
    if (!authUser || currentChatType === 'ai') return
    if (!activeChat) {
      showNotification('Select a chat first.', '#ef4444')
      return
    }

    const action = window.prompt('Type "block" to block a user or "report" to report.')
    if (!action) return

    if (action.toLowerCase() === 'block') {
      let targetId = ''
      if (activeChat.type === 'DIRECT') {
        const other = activeChat.participants.find(p => p.id !== authUser.id)
        targetId = other?.id || ''
      } else {
        targetId = window.prompt('Enter user ID to block') || ''
      }
      if (!targetId) return

      const response = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetId })
      })
      if (!response.ok) {
        const data = await response.json()
        showNotification(data?.error || 'Failed to block user.', '#ef4444')
        return
      }
      showNotification('User blocked.')
    } else if (action.toLowerCase() === 'report') {
      let targetId = ''
      if (activeChat.type === 'DIRECT') {
        const other = activeChat.participants.find(p => p.id !== authUser.id)
        targetId = other?.id || ''
      } else {
        targetId = window.prompt('Enter user ID to report') || ''
      }
      if (!targetId) return
      const reason = window.prompt('Reason for report?') || ''
      if (!reason.trim()) {
        showNotification('Report reason is required.', '#ef4444')
        return
      }
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportedId: targetId, reason })
      })
      if (!response.ok) {
        const data = await response.json()
        showNotification(data?.error || 'Failed to report user.', '#ef4444')
        return
      }
      showNotification('Report submitted.')
    }
  }

  // Show notification
  const [notification, setNotification] = useState<{ message: string; color: string } | null>(null)

  const showNotification = (message: string, color: string = 'var(--primary-color)') => {
    setNotification({ message, color })
    setTimeout(() => setNotification(null), 3000)
  }

  const activeChat = activeChatId ? chats.find(chat => chat.id === activeChatId) : null
  const activeChatTitle =
    currentChatType === 'ai' ? 'AI Assistant' : getChatDisplayName(activeChat)
  const isRealtimeChat = currentChatType !== 'ai'
  const isInputDisabled =
    isTyping || (isRealtimeChat && (!authUser || !isConnected || !activeChatId))
  const headerIconClass =
    currentChatType === 'ai'
      ? 'fas fa-robot'
      : activeChat?.type === 'DIRECT'
      ? 'fas fa-user'
      : activeChat?.type === 'GROUP'
      ? 'fas fa-users'
      : 'fas fa-globe'
  const headerAvatarStyle =
    currentChatType === 'ai'
      ? { background: 'linear-gradient(45deg, #2575fc, #ff3366)' }
      : activeChat?.type === 'DIRECT'
      ? { background: 'linear-gradient(45deg, #10b981, #3b82f6)' }
      : activeChat?.type === 'GROUP'
      ? { background: 'linear-gradient(45deg, #f97316, #ec4899)' }
      : { background: 'linear-gradient(45deg, #6a11cb, #2575fc)' }

  // Render login/register
  const renderLoginPrompt = () => (
    <div className="login-section">
      {authUser ? (
        <div className="info-container">
          <h2 className="info-title">You are logged in</h2>
          <div className="info-content">
            <p>Signed in as {authUser.email}.</p>
            <button type="button" className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      ) : (
        <>
      {authLoading ? (
        <h2 className="info-title">Checking session...</h2>
      ) : (
        <h2 className="info-title">{authMode === 'login' ? 'Login' : 'Create Account'}</h2>
      )}
      <div className="login-container">
        <div className="login-card expanded">
          <div className="login-title">
            <span className="login-text">{authMode === 'login' ? 'Welcome Back' : 'Join Get Speak'}</span>
          </div>
          <div className="login-form" style={{ opacity: 1, transform: 'translateY(0) scale(1)' }}>
            {authMode === 'register' && (
              <div className="input-group">
                <input
                  type="text"
                  className="login-input"
                  placeholder="Full name"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                />
              </div>
            )}
            <div className="input-group">
              <input
                type="email"
                className="login-input"
                placeholder="Email address"
                value={authMode === 'login' ? loginEmail : registerEmail}
                onChange={(e) =>
                  authMode === 'login'
                    ? setLoginEmail(e.target.value)
                    : setRegisterEmail(e.target.value)
                }
              />
            </div>
            <div className="input-group">
              <input
                type="password"
                className="login-input"
                placeholder="Password"
                value={authMode === 'login' ? loginPassword : registerPassword}
                onChange={(e) =>
                  authMode === 'login'
                    ? setLoginPassword(e.target.value)
                    : setRegisterPassword(e.target.value)
                }
              />
            </div>
            {authError && (
              <div className="auth-error">{authError}</div>
            )}
            <button
              type="button"
              className="login-btn"
              onClick={authMode === 'login' ? handleLogin : handleRegister}
              disabled={authLoading}
            >
              {authMode === 'login' ? 'Login' : 'Create Account'}
            </button>
            <button
              type="button"
              className="auth-toggle"
              onClick={() => {
                setAuthError(null)
                setAuthMode(authMode === 'login' ? 'register' : 'login')
              }}
            >
              {authMode === 'login'
                ? 'Need an account? Create one'
                : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </div>
      <p style={{ color: 'var(--text-color)', opacity: 0.7 }}>
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: isConnected ? '#22c55e' : '#ef4444',
            marginRight: 8
          }}
        />
        {isConnected ? 'Connected to server' : 'Connecting to server...'}
      </p>
        </>
      )}
    </div>
  )

  // Render home section
  const renderHome = () => (
    <div className="home-container">
      <h1 className="home-title">Get Speak</h1>
      <p className="home-subtitle">Connect with people around the world instantly</p>
      <div className="home-buttons">
        <button className="btn btn-primary" onClick={authUser ? switchToGlobalChat : () => setActiveSection('login')}>
          {authUser ? 'Start Chatting' : 'Login'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setAuthMode('register')
            setActiveSection('login')
          }}
        >
          Sign Up
        </button>
      </div>
      
      <div className="features">
        <div className="feature-card">
          <div className="feature-icon">
            <i className="fas fa-comments"></i>
          </div>
          <h3 className="feature-title">Real-time Chat</h3>
          <p className="feature-description">Connect with people instantly in real-time conversations with Socket.io powered messaging.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <i className="fas fa-globe"></i>
          </div>
          <h3 className="feature-title">Global Community</h3>
          <p className="feature-description">Meet people from different cultures and backgrounds from around the world.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <i className="fas fa-shield-alt"></i>
          </div>
          <h3 className="feature-title">Safe & Secure</h3>
          <p className="feature-description">Your privacy and security are our top priorities with encrypted connections.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <i className="fas fa-robot"></i>
          </div>
          <h3 className="feature-title">AI Assistant</h3>
          <p className="feature-description">Get help from our AI assistant anytime you need it - powered by advanced AI.</p>
        </div>
      </div>
    </div>
  )

  // Render chat section
  const renderChat = () => {
    if (authLoading) {
      return (
        <div className="info-container">
          <h2 className="info-title">Loading...</h2>
          <div className="info-content">
            <p>Checking your session.</p>
          </div>
        </div>
      )
    }

    if (!authUser) {
      return (
        <div className="info-container">
          <h2 className="info-title">Login Required</h2>
          <div className="info-content">
            <p>Please login to access the chat.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveSection('login')}
            >
              Go to Login
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="chat-container">
      <div className="chat-sidebar">
        <div className="chat-search">
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Search chats..." />
        </div>
        <div className="chat-list">
          {/* Global Chat */}
          <div
            className={`chat-item ${currentChatType === 'global' ? 'active' : ''}`}
            onClick={switchToGlobalChat}
          >
            <div className="chat-avatar" style={{ background: 'linear-gradient(45deg, #6a11cb, #2575fc)' }}>
              <i className="fas fa-globe"></i>
            </div>
            <div className="chat-info">
              <div className="chat-name">Global Chat</div>
              <div className="chat-preview">{onlineUsers.length} users online</div>
            </div>
            <div className="chat-time">
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: isConnected ? '#22c55e' : '#ef4444' }} />
            </div>
          </div>

          {/* AI Assistant */}
            <div
              className={`chat-item ${currentChatType === 'ai' ? 'active' : ''}`}
              onClick={switchToAIChat}
            >
              <div className="chat-avatar" style={{ background: 'linear-gradient(45deg, #2575fc, #ff3366)' }}>
              <i className="fas fa-robot"></i>
            </div>
            <div className="chat-info">
              <div className="chat-name">AI Assistant</div>
              <div className="chat-preview">Ask me anything!</div>
            </div>
              <div className="chat-time">
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e' }} />
              </div>
            </div>

            <div className="chat-section-title">
              Your Chats
              <button type="button" className="chat-action" onClick={createGroupChat}>
                + New Group
              </button>
            </div>
            {isChatsLoading && <div className="chat-preview">Loading chats...</div>}
            {chats.filter(chat => chat.type !== 'GLOBAL').length === 0 && !isChatsLoading && (
              <div className="chat-preview">No chats yet.</div>
            )}
            {chats
              .filter(chat => chat.type !== 'GLOBAL')
              .map(chat => (
                <div
                  key={chat.id}
                  className={`chat-item ${
                    activeChatId === chat.id && currentChatType !== 'ai' ? 'active' : ''
                  }`}
                  onClick={() => switchToChat(chat)}
                >
                  <div
                    className="chat-avatar"
                    style={{
                      background:
                        chat.type === 'DIRECT'
                          ? 'linear-gradient(45deg, #10b981, #3b82f6)'
                          : 'linear-gradient(45deg, #f97316, #ec4899)',
                    }}
                  >
                    <i className={chat.type === 'DIRECT' ? 'fas fa-user' : 'fas fa-users'}></i>
                  </div>
                  <div className="chat-info">
                    <div className="chat-name">{getChatDisplayName(chat)}</div>
                    <div className="chat-preview">
                      {chat.lastMessage?.content || 'No messages yet'}
                    </div>
                  </div>
                </div>
              ))}

            {/* Online Users (show IDs) */}
            {onlineUsers.length > 0 && (
              <div className="user-list">
                <div className="user-list-title">Online Users</div>
                {onlineUsers.map(user => (
                  <div
                    key={user.id}
                    className="user-item"
                    onClick={() => startDirectChat(user.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="user-avatar">
                      {user.username?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{user.name || user.username || 'Unknown User'}</div>
                      <div className="user-id">ID: {user.id}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        {/* Online Users */}
        {currentChatType === 'global' && (
          <div className="online-users">
            <i className="fas fa-users"></i> {onlineUsers.length} online
          </div>
        )}
      </div>

      <div className="chat-main">
        {callActive && localStream && (
          <div className="video-panel">
            <div className="video-grid">
              <VideoTile stream={localStream} muted label="You" />
              {remoteStreams.map((item, index) => (
                <VideoTile key={item.id} stream={item.stream} label={`User ${index + 1}`} />
              ))}
            </div>
            <div className="call-controls">
              <button type="button" className="call-btn danger" onClick={endCall}>
                End Call
              </button>
              <span className="text-xs text-muted-foreground">
                Room: {roomId || '--'}
              </span>
            </div>
          </div>
        )}
        <div className="chat-header">
          <div
            className="chat-header-avatar"
            style={headerAvatarStyle}
          >
            <i className={headerIconClass}></i>
          </div>
          <div className="chat-header-info">
            <div className="chat-header-name">
              {activeChatTitle}
            </div>
            <div className="chat-header-status">
              {currentChatType === 'global' ? (
                <>
                  <span className="status-dot" style={{ backgroundColor: isConnected ? '#22c55e' : '#ef4444' }} />
                  {isConnected ? 'Connected' : 'Disconnected'}
                </>
              ) : (
                <>
                  <span className="status-dot" />
                  {currentChatType === 'ai' ? 'Always Online' : 'Private Room'}
                </>
              )}
            </div>
          </div>
        <div className="chat-header-actions">
            <button
              type="button"
              title="Start Call"
              aria-label="Start Call"
              onClick={() => setIsCallModalOpen(true)}
            >
              <i className="fas fa-phone"></i>
            </button>
            <button
              type="button"
              title="Start Video Call"
              aria-label="Start Video Call"
              onClick={() => setIsCallModalOpen(true)}
            >
              <i className="fas fa-video"></i>
            </button>
            <button
              type="button"
              title="More Options"
              aria-label="More Options"
              onClick={handleMoreOptions}
            >
              <i className="fas fa-ellipsis-v"></i>
            </button>
          </div>
        </div>

        <div className="chat-messages" ref={messagesContainerRef}>
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`message ${
                msg.type === 'system'
                  ? 'system'
                  : msg.type === 'bot'
                  ? 'bot'
                  : msg.senderId && authUser && msg.senderId === authUser.id
                  ? 'sent'
                  : 'received'
              }`}
            >
              <div>
                {msg.type === 'user' && msg.senderName && msg.senderId !== authUser?.id && (
                  <div className="message-sender">{msg.senderName}</div>
                )}
                {msg.content}
              </div>
              {msg.type !== 'system' && (
                <div className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          <input
            type="text"
            placeholder={
              currentChatType === 'ai'
                ? 'Ask the AI...'
                : !authUser
                ? 'Please login to chat...'
                : !isConnected
                ? 'Connecting to chat...'
                : !activeChatId
                ? 'Select a chat...'
                : 'Type a message...'
            }
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isInputDisabled}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isInputDisabled}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
      </div>
    )
  }

  // Render about section
  const renderAbout = () => (
    <div className="info-container">
      <h2 className="info-title">About Get Speak</h2>
      <div className="info-content">
        <p>Welcome to Get Speak, the revolutionary chat application that connects you with people from all around the world. Our platform is designed to make communication easy, fun, and secure.</p>
        
        <p>Founded in 2026, Get Speak has quickly become one of the most popular chat applications, with millions of users worldwide. Our mission is to break down barriers and bring people together through meaningful conversations.</p>
        
        <p>Whether you&apos;re looking to make new friends, practice a new language, or simply have a casual chat, Get Speak is the perfect platform for you. With our advanced matching algorithm, you&apos;ll be connected with like-minded individuals in no time.</p>
        
        <p>At Get Speak, we value your privacy and security above all else. That&apos;s why we&apos;ve implemented state-of-the-art encryption and security measures to ensure that your conversations remain private and secure.</p>
        
        <p>Join us today and experience the future of online communication!</p>
        <div className="about-developer">
          <img
            className="about-photo"
            src="/developer.png"
            alt="Developer Ganesh Baradkar"
          />
          <div className="about-dev-text">
            <h3>Ganesh Baradkar</h3>
            <div className="dev-title">Developer</div>
            <p>Creator of Get Speak.</p>
          </div>
        </div>
      </div>
    </div>
  )

  // Render contact section
  const renderContact = () => (
    <div className="info-container">
      <h2 className="info-title">Contact Us</h2>
      <div className="info-content">
        <p>We&apos;d love to hear from you! Whether you have a question, feedback, or just want to say hello, feel free to reach out to us using the form below.</p>
        
        <form
          className="contact-form"
          onSubmit={e => {
            e.preventDefault()
            showNotification('Your message has been sent successfully!', 'var(--primary-color)')
            e.currentTarget.reset()
          }}
        >
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input type="text" id="name" placeholder="Your Name" required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" placeholder="Your Email" required />
          </div>
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input type="text" id="subject" placeholder="Subject" required />
          </div>
          <div className="form-group">
            <label htmlFor="message">Message</label>
            <textarea id="message" placeholder="Your Message" required></textarea>
          </div>
          <button type="submit" className="btn btn-primary">Send Message</button>
        </form>
      </div>
    </div>
  )

  // Render help section
  const renderHelp = () => (
    <div className="info-container">
      <h2 className="info-title">Help & Support</h2>
      <div className="info-content">
        <p>Here are some frequently asked questions about Get Speak. If you can&apos;t find what you&apos;re looking for, feel free to contact our support team or ask our AI assistant.</p>
        
        <ul className="help-list">
          <li className="help-item">
            <div className="help-question">How do I create an account?</div>
            <div>Creating an account is easy! Click &quot;Sign Up&quot; on the home page and enter your email and password.</div>
          </li>
          <li className="help-item">
            <div className="help-question">How do I start a chat with others?</div>
            <div>Click on the chat section and select Global Chat to talk with all connected users, or click on any user from the list to start a private conversation.</div>
          </li>
          <li className="help-item">
            <div className="help-question">How do I chat with the AI assistant?</div>
            <div>Click on the AI Assistant in the chat list or use the AI chat button in the bottom right corner. The AI is available 24/7 to help you with any questions.</div>
          </li>
          <li className="help-item">
            <div className="help-question">Is Get Speak free to use?</div>
            <div>Yes, Get Speak is completely free to use. We offer premium features for users who want an enhanced experience, but our basic features are available to everyone at no cost.</div>
          </li>
          <li className="help-item">
            <div className="help-question">How do I report inappropriate behavior?</div>
            <div>If you encounter any inappropriate behavior, please report it immediately by clicking on the report button in the chat. Our team will review the report and take appropriate action.</div>
          </li>
          <li className="help-item">
            <div className="help-question">How does real-time chat work?</div>
            <div>Get Speak uses Socket.io technology for real-time bidirectional communication. Messages are delivered instantly to all connected users without page refreshes.</div>
          </li>
        </ul>
      </div>
    </div>
  )

  return (
    <>
      <style>{styles}</style>
      
      {/* Navigation */}
      <nav className="navbar">
        <div className="logo">Get Speak</div>
        <ul className="nav-links">
          {['home', 'chat', 'about', 'contact', 'help'].map(section => (
            <li key={section}>
              <a
                href="#"
                className={activeSection === section ? 'active' : ''}
                onClick={e => {
                  e.preventDefault()
                  setActiveSection(section)
                }}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </a>
            </li>
          ))}
          <li>
            {authUser ? (
              <a
                href="#"
                onClick={e => {
                  e.preventDefault()
                  handleLogout()
                }}
              >
                Logout
              </a>
            ) : (
              <a
                href="#"
                className={activeSection === 'login' ? 'active' : ''}
                onClick={e => {
                  e.preventDefault()
                  setActiveSection('login')
                }}
              >
                Login
              </a>
            )}
          </li>
        </ul>
        <div className="theme-toggle">
          <label className="switch">
            <input type="checkbox" checked={isDark} onChange={toggleTheme} aria-label="Toggle dark mode" />
            <span className="slider"></span>
          </label>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        <section className={`section ${activeSection === 'home' ? 'active' : ''}`}>
          {renderHome()}
        </section>

        <section className={`section ${activeSection === 'chat' ? 'active' : ''}`}>
          {renderChat()}
        </section>

        <section className={`section ${activeSection === 'about' ? 'active' : ''}`}>
          {renderAbout()}
        </section>

        <section className={`section ${activeSection === 'contact' ? 'active' : ''}`}>
          {renderContact()}
        </section>

        <section className={`section ${activeSection === 'help' ? 'active' : ''}`}>
          {renderHelp()}
        </section>

        <section className={`section ${activeSection === 'login' ? 'active' : ''}`}>
          {renderLoginPrompt()}
        </section>
      </div>

      {/* Floating Buttons */}
      {activeSection === 'chat' && (
        <>
          <button
            type="button"
            className="ai-chat-btn"
            onClick={switchToAIChat}
            title="Chat with AI Assistant"
            aria-label="Chat with AI Assistant"
          >
            <i className="fas fa-robot"></i>
          </button>
        </>
      )}

      {/* Notification */}
      {notification && (
        <div
          className="notification"
          style={{ backgroundColor: notification.color }}
        >
          {notification.message}
        </div>
      )}

      {isCallModalOpen && (
        <div className="call-modal" role="dialog" aria-modal="true">
          <div className="call-modal-card">
            <h3>Start a Call</h3>
            <div className="call-option">
              <button
                type="button"
                className={callMode === '1to1' ? 'active' : ''}
                onClick={() => setCallMode('1to1')}
              >
                1-to-1
              </button>
              <button
                type="button"
                className={callMode === 'group' ? 'active' : ''}
                onClick={() => setCallMode('group')}
              >
                Group
              </button>
            </div>
            <input
              className="call-input"
              placeholder="Room code"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <div className="call-controls">
              <button type="button" className="call-btn" onClick={createRoomCode}>
                Create Room Code
              </button>
              <button type="button" className="call-btn primary" onClick={startCall}>
                Start {callMode === '1to1' ? '1-to-1' : 'Group'} Call
              </button>
              <button type="button" className="call-btn" onClick={() => setIsCallModalOpen(false)}>
                Cancel
              </button>
            </div>
            {callError && <div className="call-error">{callError}</div>}
            <p className="text-xs text-muted-foreground">
              Share the same room code with others to join the call.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
