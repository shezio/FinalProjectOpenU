import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/CelebrationEffect.css';

const CONFETTI_EMOJIS = ['🎉', '🎊', '✨', '🌟', '⭐', '🎈', '🎁', '🏆', '👏', '💪', '🎯', '📈'];
const FAMILY_CELEBRATION_EMOJIS = ['✈️', '🧸', '🪁', '🦋', '🎨', '🎪', '🎭', '🎬', '🎤', '🎸'];

const CelebrationEffect = ({ isActive, userName, celebrationType = 'tutorship' }) => {
  const { t } = useTranslation();
  const [confetti, setConfetti] = useState([]);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    // Pick a random meme message key (1-10)
    const messageNum = Math.floor(Math.random() * 10) + 1;
    setMessageIndex(messageNum);

    // Select emoji array based on celebration type
    const emojiArray = celebrationType === 'family' ? FAMILY_CELEBRATION_EMOJIS : CONFETTI_EMOJIS;

    // Generate confetti particles from ALL edges
    const confettiPieces = Array.from({ length: 80 }, (_, i) => {
      let startLeft, startTop, endLeft, endTop;
      const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
      
      if (edge === 0) { // Top
        startLeft = Math.random() * window.innerWidth;
        startTop = -50;
        endLeft = startLeft + (Math.random() - 0.5) * 400;
        endTop = window.innerHeight + 50;
      } else if (edge === 1) { // Right
        startLeft = window.innerWidth + 50;
        startTop = Math.random() * window.innerHeight;
        endLeft = -50;
        endTop = startTop + (Math.random() - 0.5) * 400;
      } else if (edge === 2) { // Bottom
        startLeft = Math.random() * window.innerWidth;
        startTop = window.innerHeight + 50;
        endLeft = startLeft + (Math.random() - 0.5) * 400;
        endTop = -50;
      } else { // Left
        startLeft = -50;
        startTop = Math.random() * window.innerHeight;
        endLeft = window.innerWidth + 50;
        endTop = startTop + (Math.random() - 0.5) * 400;
      }
      
      return {
        id: i,
        left: startLeft,
        top: startTop,
        endLeft,
        endTop,
        delay: Math.random() * 0.8,
        duration: 3 + Math.random() * 2,
        emoji: emojiArray[Math.floor(Math.random() * emojiArray.length)],
        size: 20 + Math.random() * 30,
      };
    });

    setConfetti(confettiPieces);

    // Clear confetti after animation completes
    const timer = setTimeout(() => {
      setConfetti([]);
    }, 5500);

    return () => clearTimeout(timer);
  }, [isActive, celebrationType]);

  if (!isActive) return null;

  const messageKeyPrefix = celebrationType === 'family' ? 'family_message_' : 'confetti_message_';
  const memeMessage = t(messageKeyPrefix + messageIndex, { 
    userName: userName || '' 
  });

  return (
    <div className="celebration-container">
      {/* Confetti shower */}
      <div className="confetti-shower">
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className="confetti-piece"
            style={{
              left: `${piece.left}px`,
              top: `${piece.top}px`,
              '--delay': `${piece.delay}s`,
              '--duration': `${piece.duration}s`,
              '--size': `${piece.size}px`,
              '--tx': `translateX(${piece.endLeft - piece.left}px)`,
              '--ty': `translateY(${piece.endTop - piece.top}px)`,
            }}
          >
            <span
              style={{
                fontSize: `${piece.size}px`,
                display: 'block',
                animation: `floatAround ${piece.duration}s ease-out ${piece.delay}s forwards`,
              }}
            >
              {piece.emoji}
            </span>
          </div>
        ))}
      </div>

      {/* Meme message popup - split into individual words */}
      {memeMessage && memeMessage.split(' ').map((word, idx) => (
        <div
          key={idx}
          className="celebration-message"
          style={{
            animation: `messageFloat 4s ease-in-out forwards`,
            animationDelay: `${idx * 0.15}s`,
          }}
        >
          <div className="message-content">
            <div className="message-text">{word}</div>
            {idx === 0 && userName && <div className="user-name">👤 {userName}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CelebrationEffect;
