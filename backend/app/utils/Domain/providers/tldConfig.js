// Default TLDs commonly used for general purposes
const DEFAULT_TLDS = [
  '.com',
  '.net',
  '.org'
];

// Country-level TLDs (ccTLDs) assigned to specific countries or territories
const COUNTRY_TLDS = [
  '.ac', '.ad', '.ae', '.af', '.ag', '.ai', '.al', '.am', '.ao', '.aq', '.ar', '.as', '.at', '.au', '.aw', '.ax',
  '.az', '.ba', '.bb', '.bd', '.be', '.bf', '.bg', '.bh', '.bi', '.bj', '.bm', '.bn', '.bo', '.br', '.bs', '.bt',
  '.bv', '.bw', '.by', '.bz', '.ca', '.cc', '.cd', '.cf', '.cg', '.ch', '.ci', '.ck', '.cl', '.cm', '.cn', '.co',
  '.cr', '.cu', '.cv', '.cw', '.cx', '.cy', '.cz', '.de', '.dj', '.dk', '.dm', '.do', '.dz', '.ec', '.ee', '.eg',
  '.er', '.es', '.et', '.eu', '.fi', '.fj', '.fk', '.fm', '.fo', '.fr', '.ga', '.gb', '.gd', '.ge', '.gf', '.gg',
  '.gh', '.gi', '.gl', '.gm', '.gn', '.gp', '.gq', '.gr', '.gs', '.gt', '.gu', '.gw', '.gy', '.hk', '.hm', '.hn',
  '.hr', '.ht', '.hu', '.id', '.ie', '.il', '.im', '.in', '.io', '.iq', '.ir', '.is', '.it', '.je', '.jm', '.jo',
  '.jp', '.ke', '.kg', '.kh', '.ki', '.km', '.kn', '.kp', '.kr', '.kw', '.ky', '.kz', '.la', '.lb', '.lc', '.li',
  '.lk', '.lr', '.ls', '.lt', '.lu', '.lv', '.ly', '.ma', '.mc', '.md', '.me', '.mg', '.mh', '.mk', '.ml', '.mm',
  '.mn', '.mo', '.mp', '.mq', '.mr', '.ms', '.mt', '.mu', '.mv', '.mw', '.mx', '.my', '.mz', '.na', '.nc', '.ne',
  '.nf', '.ng', '.ni', '.nl', '.no', '.np', '.nr', '.nu', '.nz', '.om', '.pa', '.pe', '.pf', '.pg', '.ph', '.pk',
  '.pl', '.pm', '.pn', '.pr', '.ps', '.pt', '.pw', '.py', '.qa', '.re', '.ro', '.rs', '.ru', '.rw', '.sa', '.sb',
  '.sc', '.sd', '.se', '.sg', '.sh', '.si', '.sj', '.sk', '.sl', '.sm', '.sn', '.so', '.sr', '.ss', '.st', '.sv',
  '.sx', '.sy', '.sz', '.tc', '.td', '.tf', '.tg', '.th', '.tj', '.tk', '.tl', '.tm', '.tn', '.to', '.tr', '.tt',
  '.tv', '.tw', '.tz', '.ua', '.ug', '.uk', '.us', '.uy', '.uz', '.va', '.vc', '.ve', '.vg', '.vi', '.vn', '.vu',
  '.wf', '.ws', '.ye', '.yt', '.za', '.zm', '.zw'
];


const CR_SUPPORTED_TLDS = [
  '.ac', '.co', '.co.in', '.co.nl', '.co.no', '.com.bh', '.com.de', '.com.in', 
  '.com.ph', '.com.se', '.info.bh', '.org.bh', '.org.ph', '.ph', '.co.bz', 
  '.co.lc', '.co.mu', '.com.ag', '.com.ai', '.com.lc', '.com.mu', '.com.pr', 
  '.com.sc', '.com.vc', '.edu.mu', '.info.pr', '.isla.pr'
]

// Function to extract the TLD from a domain name
function extractTLD(domain) {
  const parts = domain.split('.');
  if (parts.length <= 1) return null;
  return '.' + parts.slice(-2).join('.');
}

// Function to determine the category of a TLD
function getTLDCategory(domain) {
  const tld = extractTLD(domain);
  if (!tld) return 'unknown';
  if (DEFAULT_TLDS.includes(tld)) return 'default';
  if (CR_SUPPORTED_TLDS.includes(tld)) return 'cr_supported';
  if (COUNTRY_TLDS.includes(tld)) return 'country';
  return 'other';
}


const splitDomain=(fullDomain)=> {
	const parts = fullDomain.split(".");
	if (parts.length < 2) return { name: fullDomain, extension: "" };

	return {
		name: parts[0],
		extension: parts.slice(1).join("."), // everything after the first dot
	};
}

module.exports = {
  DEFAULT_TLDS,
  COUNTRY_TLDS,
  extractTLD,
  getTLDCategory,
  splitDomain
};
