// ============================================================
//  SkinData.js — 무기 스킨 데이터 (프라임, 약탈자, 군주, 스펙트럼 등)
// ============================================================
const SKIN_DATA = {
  vandal: [
    { id: 'default', name: '기본 밴달', color: '#f8fafc', accent: '#00d4ff', tracer: '#ffee88', price: '0 VP' },
    { id: 'reaver', name: '🔮 약탈자 밴달 (Reaver)', color: '#7e22ce', accent: '#c084fc', tracer: '#a855f7', finisher: 'reaver', price: '1,775 VP' },
    { id: 'prime', name: '⚡ 프라임 밴달 (Prime)', color: '#ffffff', accent: '#eab308', tracer: '#f59e0b', finisher: 'prime', price: '1,775 VP' },
    { id: 'elderflame', name: '🐲 엘더플레임 밴달 (Elderflame)', color: '#b91c1c', accent: '#f97316', tracer: '#ef4444', finisher: 'fire', price: '2,475 VP' },
  ],
  ghost: [
    { id: 'default', name: '기본 고스트', color: '#f8fafc', accent: '#00d4ff', tracer: '#8899ff', price: '0 VP' },
    { id: 'sovereign', name: '👑 군주 고스트 (Sovereign)', color: '#e2e8f0', accent: '#f5a623', tracer: '#fbbf24', finisher: 'prime', price: '1,775 VP' },
    { id: 'reaver', name: '🔮 약탈자 고스트 (Reaver)', color: '#6b21a8', accent: '#a855f7', tracer: '#c084fc', finisher: 'reaver', price: '1,775 VP' },
  ],
  phantom: [
    { id: 'default', name: '기본 팬텀', color: '#334155', accent: '#00d4ff', tracer: '#8899ff', price: '0 VP' },
    { id: 'spectrum', name: '🌈 스펙트럼 팬텀 (Spectrum)', color: '#f8fafc', accent: '#ec4899', tracer: '#3b82f6', finisher: 'spectrum', price: '2,675 VP' },
    { id: 'oni', name: '👹 오니 팬텀 (Oni)', color: '#991b1b', accent: '#fbbf24', tracer: '#f97316', finisher: 'fire', price: '1,775 VP' },
  ],
  operator: [
    { id: 'default', name: '기본 오퍼레이터', color: '#1e293b', accent: '#00d4ff', tracer: '#00d4ff', price: '0 VP' },
    { id: 'glitchpop', name: '👾 글리치팝 오퍼레이터 (Glitchpop)', color: '#ec4899', accent: '#06b6d4', tracer: '#f43f5e', finisher: 'spectrum', price: '2,175 VP' },
    { id: 'reaver', name: '🔮 약탈자 오퍼레이터 (Reaver)', color: '#581c87', accent: '#c084fc', tracer: '#a855f7', finisher: 'reaver', price: '1,775 VP' },
  ]
};

// 플레이어 무기별 선택된 스킨 저장소
if (typeof window !== 'undefined') {
  window.EQUIPPED_SKINS = {
    vandal: 'reaver',
    ghost: 'sovereign',
    phantom: 'spectrum',
    operator: 'glitchpop'
  };
}
