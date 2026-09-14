import React from 'react';
import tokerbankLogo from '../assets/tokerbank-logo.png';

/**
 * Parses numeric risk score from values like:
 * 1, 92, "1.00%", "92%", "92.0", null, undefined
 */
export const parseRiskScore = (riskScore) => {
  if (typeof riskScore === 'number') {
    return Math.round(riskScore);
  }
  if (!riskScore) return 0;
  const cleaned = riskScore.toString().replace('%', '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
};

/**
 * Maps raw risk level & score into TokerBank's 4-Tier AI Fraud Shield classification:
 * - SAFE: 0 - 25% (Düşük / Güvenli)
 * - MEDIUM: 26 - 55% (Orta Risk / Şüpheli İzleme)
 * - HIGH: 56 - 80% (Yüksek Risk / OTP Challenge)
 * - CRITICAL: 81 - 100% (Kritik Risk / Otomatik Bloke)
 */
export const getRiskBadgeInfo = (riskLevel, riskScore) => {
  const score = parseRiskScore(riskScore);
  const normalizedLevel = (riskLevel || '').toString().trim().toUpperCase();

  // Tier 1: CRITICAL (81 - 100%)
  if (normalizedLevel === 'CRITICAL' || score > 80) {
    return {
      level: 'CRITICAL',
      score,
      label: 'Kritik Risk',
      tagClass: 'critical',
      icon: '🛑',
      description: 'Kritik risk tespit edildi, işlem bloke edildi veya üst düzey doğrulama istendi.'
    };
  }

  // Tier 2: HIGH (56 - 80%)
  if (normalizedLevel === 'HIGH' || score > 55) {
    return {
      level: 'HIGH',
      score,
      label: 'Yüksek Risk',
      tagClass: 'high',
      icon: '⚠️',
      description: 'Olağan dışı işlem hacmi, dinamik 2FA OTP onayı uygulandı.'
    };
  }

  // Tier 3: MEDIUM (26 - 55%)
  if (normalizedLevel === 'MEDIUM' || score > 25) {
    return {
      level: 'MEDIUM',
      score,
      label: 'Orta Risk',
      tagClass: 'medium',
      icon: '👁️',
      description: 'Hafif anomali sapması, denetim kaydına şüpheli izleme bayrağı eklendi.'
    };
  }

  // Tier 4: SAFE (0 - 25%)
  return {
    level: 'SAFE',
    score,
    label: 'Güvenli',
    tagClass: 'safe',
    icon: '🛡️',
    description: 'AI Fraud Shield kalkanı tarafından otomatik onaylandı.'
  };
};

/**
 * Reusable Risk Badge Component
 */
export const RiskBadge = ({ riskLevel, riskScore, showLogo = true }) => {
  const info = getRiskBadgeInfo(riskLevel, riskScore);

  return (
    <span 
      className={`risk-tag ${info.tagClass}`} 
      title={`AI Fraud Shield: ${info.level} (${info.description})`}
    >
      {info.tagClass === 'safe' && showLogo ? (
        <img
          src={tokerbankLogo}
          alt="TokerBank"
          style={{ width: '13px', height: '13px', objectFit: 'contain', verticalAlign: 'middle', marginRight: '3px' }}
        />
      ) : (
        <span style={{ marginRight: '3px', fontSize: '11px' }}>{info.icon}</span>
      )}
      <span>%{info.score} {info.label}</span>
    </span>
  );
};
