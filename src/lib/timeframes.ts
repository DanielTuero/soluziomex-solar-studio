export const minimumContractYears=1;
export const maximumContractYears=40;

export function normalizeContractYears(value:unknown,fallback=15){
  const years=Math.round(Number(value));
  return Number.isFinite(years)?Math.min(maximumContractYears,Math.max(minimumContractYears,years)):fallback;
}

export function normalizeScenarioYears(value:unknown,activeYears=15){
  let candidates:unknown=value;
  if(typeof value==="string"){
    try{candidates=JSON.parse(value)}catch{candidates=[]}
  }
  const years=Array.isArray(candidates)?candidates.map(item=>normalizeContractYears(item,0)).filter(item=>item>=minimumContractYears):[];
  const defaults=[10,15,20,25].map(item=>normalizeContractYears(item));
  const normalized=[...new Set(years.length?years:defaults)].sort((a,b)=>a-b).slice(0,8);
  return normalized.length?normalized:[normalizeContractYears(activeYears)];
}

export function comparisonTimeframes(scenarios:unknown,activeYears:unknown){
  const active=normalizeContractYears(activeYears);
  return [...new Set([...normalizeScenarioYears(scenarios,active),active])].sort((a,b)=>a-b);
}
