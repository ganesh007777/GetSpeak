'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

// Types
interface User {
  id: string
  username: string
}

interface Message {
  id: string
  username: string
  content: string
  timestamp: Date | string
  type: 'user' | 'system' | 'bot'
}

interface ChatUser {
  id: string
  name: string
  initials: string
  preview: string
  time: string
  online: boolean
}

// Demo chat users
const demoUsers: ChatUser[] = [
  { id: '1', name: 'John Smith', initials: 'JS', preview: 'Hey, how are you doing?', time: '10:30 AM', online: true },
  { id: '2', name: 'Mary Johnson', initials: 'MJ', preview: 'See you tomorrow!', time: 'Yesterday', online: true },
  { id: '3', name: 'Robert Brown', initials: 'RB', preview: 'Thanks for your help!', time: 'Yesterday', online: false },
  { id: '4', name: 'Emily Wilson', initials: 'EW', preview: 'Did you see the new movie?', time: 'Wednesday', online: true },
]

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

  .random-chat-btn,
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

  .random-chat-btn {
    bottom: 30px;
    right: 30px;
    background: linear-gradient(45deg, var(--accent-color), var(--primary-color));
    box-shadow: 0 4px 15px rgba(255, 51, 102, 0.4);
  }

  .random-chat-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 20px rgba(255, 51, 102, 0.6);
  }

  .ai-chat-btn {
    bottom: 30px;
    right: 100px;
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
    .random-chat-btn { bottom: 30px; }
  }
`

export default function GetSpeak() {
  // Theme - use lazy initialization
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark')
        return true
      }
    }
    return false
  })

  // Navigation
  const [activeSection, setActiveSection] = useState('home')

  // User
  const [username, setUsername] = useState('')
  const [isUsernameSet, setIsUsernameSet] = useState(false)

  // Socket - use ref for socket instance
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])

  // Chat
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [currentChatType, setCurrentChatType] = useState<'global' | 'ai' | 'user'>('global')
  const [selectedChatUser, setSelectedChatUser] = useState<ChatUser | null>(null)
  const [isTyping, setIsTyping] = useState(false)

  // AI Chat history
  const [aiChatHistory, setAiChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

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

  // Initialize socket connection
  useEffect(() => {
    // Connect directly to the socket server on port 3003
    // Using window.location.hostname to get the current host
    const socketHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    const socketUrl = `http://${socketHost}:3003`
    
    console.log('Connecting to socket server:', socketUrl)
    
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    })

    socketRef.current = socketInstance

    const handleConnect = () => {
      setIsConnected(true)
      console.log('Connected to socket server')
    }

    const handleDisconnect = () => {
      setIsConnected(false)
      console.log('Disconnected from socket server')
    }

    const handleMessage = (msg: Message) => {
      setMessages(prev => [...prev, msg])
    }

    const handleUserJoined = (data: { user: User; message: Message }) => {
      setMessages(prev => [...prev, data.message])
      setOnlineUsers(prev => {
        if (!prev.find(u => u.id === data.user.id)) {
          return [...prev, data.user]
        }
        return prev
      })
    }

    const handleUserLeft = (data: { user: User; message: Message }) => {
      setMessages(prev => [...prev, data.message])
      setOnlineUsers(prev => prev.filter(u => u.id !== data.user.id))
    }

    const handleUsersList = (data: { users: User[] }) => {
      setOnlineUsers(data.users)
    }

    socketInstance.on('connect', handleConnect)
    socketInstance.on('disconnect', handleDisconnect)
    socketInstance.on('message', handleMessage)
    socketInstance.on('user-joined', handleUserJoined)
    socketInstance.on('user-left', handleUserLeft)
    socketInstance.on('users-list', handleUsersList)

    return () => {
      socketInstance.off('connect', handleConnect)
      socketInstance.off('disconnect', handleDisconnect)
      socketInstance.off('message', handleMessage)
      socketInstance.off('user-joined', handleUserJoined)
      socketInstance.off('user-left', handleUserLeft)
      socketInstance.off('users-list', handleUsersList)
      socketInstance.disconnect()
    }
  }, [])

  // Join chat
  const handleJoin = () => {
    if (socketRef.current && username.trim() && isConnected) {
      socketRef.current.emit('join', { username: username.trim() })
      setIsUsernameSet(true)
    }
  }

  // Send message
  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    if (currentChatType === 'global') {
      // Send to global chat via socket
      if (socketRef.current && username.trim()) {
        socketRef.current.emit('message', {
          content: inputMessage.trim(),
          username: username.trim()
        })
      }
    } else if (currentChatType === 'ai') {
      // Send to AI chat
      const userMessage: Message = {
        id: Date.now().toString(),
        username: username || 'You',
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
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          username: 'AI Assistant',
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
          username: 'AI Assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
          type: 'bot'
        }
        setMessages(prev => [...prev, errorMessage])
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
    setSelectedChatUser(null)
    setMessages([])
    setAiChatHistory([])
    setMessages([
      {
        id: '1',
        username: 'System',
        content: 'Welcome to Global Chat! Messages here are visible to all connected users.',
        timestamp: new Date(),
        type: 'system'
      }
    ])
  }

  // Switch to AI chat
  const switchToAIChat = () => {
    setActiveSection('chat')
    setCurrentChatType('ai')
    setSelectedChatUser(null)
    setMessages([
      {
        id: '1',
        username: 'AI Assistant',
        content: 'Hello! I am your AI assistant. How can I help you today?',
        timestamp: new Date(),
        type: 'bot'
      }
    ])
    setAiChatHistory([])
  }

  // Switch to demo user chat
  const switchToUserChat = (user: ChatUser) => {
    setActiveSection('chat')
    setCurrentChatType('user')
    setSelectedChatUser(user)
    setMessages([
      {
        id: '1',
        username: user.name,
        content: `Hello! I'm ${user.name}. Nice to meet you!`,
        timestamp: new Date(),
        type: 'user'
      }
    ])
  }

  // Show notification
  const [notification, setNotification] = useState<{ message: string; color: string } | null>(null)

  const showNotification = (message: string, color: string = 'var(--primary-color)') => {
    setNotification({ message, color })
    setTimeout(() => setNotification(null), 3000)
  }

  // Render login prompt
  const renderLoginPrompt = () => (
    <div className="login-section">
      <h2 className="info-title">Welcome to Get Speak</h2>
      <div className="login-container">
        <div className="login-card expanded">
          <div className="login-title">
            <span className="login-text">Join Chat</span>
          </div>
          <div className="login-form" style={{ opacity: 1, transform: 'translateY(0) scale(1)' }}>
            <div className="input-group">
              <input
                type="text"
                className="login-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
            <button
              type="button"
              className="login-btn"
              onClick={handleJoin}
              disabled={!isConnected || !username.trim()}
            >
              {isConnected ? 'Join Chat' : 'Connecting...'}
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
    </div>
  )

  // Render home section
  const renderHome = () => (
    <div className="home-container">
      <h1 className="home-title">Get Speak</h1>
      <p className="home-subtitle">Connect with people around the world instantly</p>
      <div className="home-buttons">
        <button className="btn btn-primary" onClick={isUsernameSet ? switchToGlobalChat : () => setActiveSection('login')}>
          {isUsernameSet ? 'Start Chatting' : 'Join Now'}
        </button>
        <button className="btn btn-secondary" onClick={() => setActiveSection('login')}>
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
  const renderChat = () => (
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

          {/* Demo Users */}
          {demoUsers.map(user => (
            <div
              key={user.id}
              className={`chat-item ${selectedChatUser?.id === user.id ? 'active' : ''}`}
              onClick={() => switchToUserChat(user)}
            >
              <div className="chat-avatar">{user.initials}</div>
              <div className="chat-info">
                <div className="chat-name">{user.name}</div>
                <div className="chat-preview">{user.preview}</div>
              </div>
              <div className="chat-time">{user.time}</div>
            </div>
          ))}
        </div>

        {/* Online Users */}
        {currentChatType === 'global' && (
          <div className="online-users">
            <i className="fas fa-users"></i> {onlineUsers.length} online
          </div>
        )}
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <div
            className="chat-header-avatar"
            style={
              currentChatType === 'ai'
                ? { background: 'linear-gradient(45deg, #2575fc, #ff3366)' }
                : currentChatType === 'global'
                ? { background: 'linear-gradient(45deg, #6a11cb, #2575fc)' }
                : {}
            }
          >
            {currentChatType === 'ai' ? (
              <i className="fas fa-robot"></i>
            ) : currentChatType === 'global' ? (
              <i className="fas fa-globe"></i>
            ) : selectedChatUser ? (
              selectedChatUser.initials
            ) : (
              ''
            )}
          </div>
          <div className="chat-header-info">
            <div className="chat-header-name">
              {currentChatType === 'ai'
                ? 'AI Assistant'
                : currentChatType === 'global'
                ? 'Global Chat'
                : selectedChatUser?.name || 'Chat'}
            </div>
            <div className="chat-header-status">
              {currentChatType === 'global' ? (
                <>
                  <span className="status-dot" style={{ backgroundColor: isConnected ? '#22c55e' : '#ef4444' }} />
                  {isConnected ? 'Connected' : 'Disconnected'}
                </>
              ) : currentChatType === 'ai' ? (
                <>
                  <span className="status-dot" />
                  Always Online
                </>
              ) : (
                <>
                  <span className={`status-dot ${selectedChatUser?.online ? '' : 'offline'}`} />
                  {selectedChatUser?.online ? 'Online' : 'Offline'}
                </>
              )}
            </div>
          </div>
          <div className="chat-header-actions">
            <button type="button" title="Start Call" aria-label="Start Call"><i className="fas fa-phone"></i></button>
            <button type="button" title="Start Video Call" aria-label="Start Video Call"><i className="fas fa-video"></i></button>
            <button type="button" title="More Options" aria-label="More Options"><i className="fas fa-ellipsis-v"></i></button>
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
                  : msg.username === username
                  ? 'sent'
                  : 'received'
              }`}
            >
              <div>{msg.content}</div>
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
              currentChatType === 'global' && !isUsernameSet
                ? 'Please login to chat...'
                : 'Type a message...'
            }
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={(currentChatType === 'global' && !isUsernameSet) || isTyping}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || (currentChatType === 'global' && !isUsernameSet) || isTyping}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  )

  // Render about section
  const renderAbout = () => (
    <div className="info-container">
      <h2 className="info-title">About Get Speak</h2>
      <div className="info-content">
        <p>Welcome to Get Speak, the revolutionary chat application that connects you with people from all around the world. Our platform is designed to make communication easy, fun, and secure.</p>
        
        <p>Founded in 2023, Get Speak has quickly become one of the most popular chat applications, with millions of users worldwide. Our mission is to break down barriers and bring people together through meaningful conversations.</p>
        
        <p>Whether you&apos;re looking to make new friends, practice a new language, or simply have a casual chat, Get Speak is the perfect platform for you. With our advanced matching algorithm, you&apos;ll be connected with like-minded individuals in no time.</p>
        
        <p>At Get Speak, we value your privacy and security above all else. That&apos;s why we&apos;ve implemented state-of-the-art encryption and security measures to ensure that your conversations remain private and secure.</p>
        
        <p>Join us today and experience the future of online communication! Developer Ganesh Baradkar.</p>
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
            <div>Creating an account is easy! Simply click on the &quot;Join Now&quot; button on the home page and enter your username. You&apos;ll be up and running in no time.</div>
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
          <button
            type="button"
            className="random-chat-btn"
            onClick={() => {
              const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)]
              switchToUserChat(randomUser)
              showNotification(`Connected with ${randomUser.name}`, 'var(--accent-color)')
            }}
            title="Random Chat"
          >
            <i className="fas fa-random"></i>
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
    </>
  )
}
