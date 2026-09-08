import promoAPI from '../api/promoApi';

export const getPromoCodes = () => {
  const promoCodes = {};
  
  const env = import.meta.env;
  

  if (import.meta.env.DEV) {
    const promoKeys = Object.keys(env).filter(key => key.startsWith('VITE_PROMOCODE_'));
    console.log('Found promocode keys:', promoKeys);
  }
  
  Object.keys(env).forEach((key) => {
    if (key.startsWith('VITE_PROMOCODE_')) {
      const promoValue = env[key];
      
   
      if (promoValue && typeof promoValue === 'string') {
        let promoCode, discountAmount;
        
        if (promoValue.includes(':')) {
       
          const parts = promoValue.split(':');
          if (parts.length >= 2) {
            promoCode = parts[0].trim().toUpperCase();
            discountAmount = parseFloat(parts[1].trim());
          }
        } else {
        
          promoCode = key.replace('VITE_PROMOCODE_', '');
          discountAmount = parseFloat(promoValue);
        }
        
        if (promoCode && !isNaN(discountAmount) && discountAmount > 0) {
          promoCodes[promoCode] = discountAmount;
          if (import.meta.env.DEV) {
            console.log(`Loaded promocode: ${promoCode} = $${discountAmount}`);
          }
        }
      }
    }
  });
  
  
  return promoCodes;
};



export const validatePromoCode = async (code, checkBackend = false) => {
  if (!code || typeof code !== 'string') {
    return {
      valid: false,
      discount: 0,
      code: code || '',
      error: 'Invalid promocode'
    };
  }

  const normalizedCode = code.trim().toUpperCase();
  const promoCodes = getPromoCodes();
  
  // First check if promocode exists in .env
  if (!promoCodes[normalizedCode]) {
    return {
      valid: false,
      discount: 0,
      code: normalizedCode,
      error: 'Promocode not found or invalid'
    };
  }

  const discountAmount = promoCodes[normalizedCode];

  // If backend check is requested, validate with backend
  if (checkBackend) {
    try {
      // Send both promocode and discount to backend
      const response = await promoAPI.validatePromoCode(normalizedCode, discountAmount);
      
      if (response.success && response.data.valid) {
        return {
          valid: true,
          discount: response.data.discount,
          code: normalizedCode,
          error: null,
          alreadyUsed: false
        };
      } else {
        return {
          valid: false,
          discount: 0,
          code: normalizedCode,
          error: response.message || 'Promocode validation failed',
          alreadyUsed: response.data?.alreadyUsed || false
        };
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to validate promocode';
      const alreadyUsed = error.alreadyUsed || false;
      
      return {
        valid: false,
        discount: 0,
        code: normalizedCode,
        error: errorMessage,
        alreadyUsed: alreadyUsed
      };
    }
  }

  // Client-side only validation (for initial check)
  return {
    valid: true,
    discount: discountAmount,
    code: normalizedCode,
    error: null
  };
};


export const calculateDiscount = async (subtotal, promoCode) => {
  if (!promoCode || subtotal <= 0) {
    return {
      discount: 0,
      finalAmount: subtotal,
      promoCode: null
    };
  }

  const validation = await validatePromoCode(promoCode);
  
  if (!validation.valid) {
    return {
      discount: 0,
      finalAmount: subtotal,
      promoCode: null,
      error: validation.error
    };
  }

  const discountAmount = validation.discount;
  const finalAmount = Math.max(0, subtotal - discountAmount);
  
  return {
    discount: discountAmount,
    finalAmount: finalAmount,
    promoCode: validation.code,
    error: null
  };
};


export const getAllPromoCodes = () => {
  const promoCodes = getPromoCodes();
  return Object.keys(promoCodes).map(code => ({
    code,
    discount: promoCodes[code]
  }));
};

