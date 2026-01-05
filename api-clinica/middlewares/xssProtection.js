import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

/**
 * Middleware de protección XSS
 * Sanitiza todos los inputs para prevenir Cross-Site Scripting
 */
class XSSProtection {
  
  /**
   * Configuración de DOMPurify para sanitización estricta
   */
  static getPurifyConfig() {
    return {
      ALLOWED_TAGS: [], // No permitir ningún tag HTML
      ALLOWED_ATTR: [], // No permitir ningún atributo
      KEEP_CONTENT: true, // Mantener contenido de texto
      ALLOW_DATA_ATTR: false, // No permitir data attributes
      ALLOW_UNKNOWN_PROTOCOLS: false, // No permitir protocolos desconocidos
      SANITIZE_DOM: true, // Sanitizar DOM
      SANITIZE_NAMED_PROPS: true, // Sanitizar propiedades nombradas
      RETURN_DOM: false, // No retornar DOM
      RETURN_DOM_FRAGMENT: false, // No retornar fragmentos DOM
      RETURN_DOM_IMPORT: false, // No retornar imports DOM
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
      FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit']
    };
  }

  /**
   * Sanitiza un string contra XSS
   */
  static sanitizeString(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Primero usar DOMPurify para sanitización HTML
    let sanitized = DOMPurify.sanitize(input, this.getPurifyConfig());
    
    // Luego usar validator para sanitización adicional
    sanitized = validator.escape(sanitized);
    
    // Remover patrones peligrosos adicionales
    sanitized = sanitized
      .replace(/javascript:/gi, '') // Remover javascript: protocol
      .replace(/vbscript:/gi, '') // Remover vbscript: protocol
      .replace(/data:/gi, '') // Remover data: protocol
      .replace(/on\w+\s*=/gi, '') // Remover event handlers
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remover scripts completos
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remover iframes
      .replace(/<object[^>]*>.*?<\/object>/gi, '') // Remover objects
      .replace(/<embed[^>]*>/gi, '') // Remover embeds
      .replace(/<form[^>]*>.*?<\/form>/gi, '') // Remover forms
      .replace(/<input[^>]*>/gi, '') // Remover inputs
      .replace(/<textarea[^>]*>.*?<\/textarea>/gi, '') // Remover textareas
      .replace(/<select[^>]*>.*?<\/select>/gi, '') // Remover selects
      .replace(/<button[^>]*>.*?<\/button>/gi, '') // Remover buttons
      .replace(/<link[^>]*>/gi, '') // Remover links
      .replace(/<meta[^>]*>/gi, '') // Remover meta tags
      .replace(/<style[^>]*>.*?<\/style>/gi, '') // Remover styles
      .replace(/<link[^>]*>/gi, '') // Remover links
      .replace(/<base[^>]*>/gi, '') // Remover base tags
      .replace(/<applet[^>]*>.*?<\/applet>/gi, '') // Remover applets
      .replace(/<frame[^>]*>.*?<\/frame>/gi, '') // Remover frames
      .replace(/<frameset[^>]*>.*?<\/frameset>/gi, '') // Remover framesets
      .replace(/<noframes[^>]*>.*?<\/noframes>/gi, '') // Remover noframes
      .replace(/<noscript[^>]*>.*?<\/noscript>/gi, '') // Remover noscripts
      .replace(/<marquee[^>]*>.*?<\/marquee>/gi, '') // Remover marquees
      .replace(/<blink[^>]*>.*?<\/blink>/gi, '') // Remover blinks
      .replace(/<keygen[^>]*>/gi, '') // Remover keygens
      .replace(/<source[^>]*>/gi, '') // Remover sources
      .replace(/<track[^>]*>/gi, '') // Remover tracks
      .replace(/<video[^>]*>.*?<\/video>/gi, '') // Remover videos
      .replace(/<audio[^>]*>.*?<\/audio>/gi, '') // Remover audios
      .replace(/<canvas[^>]*>.*?<\/canvas>/gi, '') // Remover canvases
      .replace(/<svg[^>]*>.*?<\/svg>/gi, '') // Remover SVGs
      .replace(/<math[^>]*>.*?<\/math>/gi, '') // Remover MathML
      .replace(/<details[^>]*>.*?<\/details>/gi, '') // Remover details
      .replace(/<summary[^>]*>.*?<\/summary>/gi, '') // Remover summaries
      .replace(/<dialog[^>]*>.*?<\/dialog>/gi, '') // Remover dialogs
      .replace(/<menu[^>]*>.*?<\/menu>/gi, '') // Remover menus
      .replace(/<menuitem[^>]*>/gi, '') // Remover menuitems
      .replace(/<command[^>]*>/gi, '') // Remover commands
      .replace(/<datalist[^>]*>.*?<\/datalist>/gi, '') // Remover datalists
      .replace(/<output[^>]*>.*?<\/output>/gi, '') // Remover outputs
      .replace(/<progress[^>]*>/gi, '') // Remover progress
      .replace(/<meter[^>]*>/gi, '') // Remover meters
      .replace(/<time[^>]*>.*?<\/time>/gi, '') // Remover times
      .replace(/<mark[^>]*>.*?<\/mark>/gi, '') // Remover marks
      .replace(/<ruby[^>]*>.*?<\/ruby>/gi, '') // Remover rubies
      .replace(/<rt[^>]*>.*?<\/rt>/gi, '') // Remover rts
      .replace(/<rp[^>]*>.*?<\/rp>/gi, '') // Remover rps
      .replace(/<bdi[^>]*>.*?<\/bdi>/gi, '') // Remover bdis
      .replace(/<bdo[^>]*>.*?<\/bdo>/gi, '') // Remover bdos
      .replace(/<wbr[^>]*>/gi, '') // Remover wbrs
      .replace(/<data[^>]*>.*?<\/data>/gi, '') // Remover datas
      .replace(/<article[^>]*>.*?<\/article>/gi, '') // Remover articles
      .replace(/<aside[^>]*>.*?<\/aside>/gi, '') // Remover asides
      .replace(/<footer[^>]*>.*?<\/footer>/gi, '') // Remover footers
      .replace(/<header[^>]*>.*?<\/header>/gi, '') // Remover headers
      .replace(/<main[^>]*>.*?<\/main>/gi, '') // Remover mains
      .replace(/<nav[^>]*>.*?<\/nav>/gi, '') // Remover navs
      .replace(/<section[^>]*>.*?<\/section>/gi, '') // Remover sections
      .replace(/<figure[^>]*>.*?<\/figure>/gi, '') // Remover figures
      .replace(/<figcaption[^>]*>.*?<\/figcaption>/gi, '') // Remover figcaptions
      .replace(/<hgroup[^>]*>.*?<\/hgroup>/gi, '') // Remover hgroups
      .replace(/<address[^>]*>.*?<\/address>/gi, '') // Remover addresses
      .replace(/<blockquote[^>]*>.*?<\/blockquote>/gi, '') // Remover blockquotes
      .replace(/<cite[^>]*>.*?<\/cite>/gi, '') // Remover cites
      .replace(/<q[^>]*>.*?<\/q>/gi, '') // Remover qs
      .replace(/<abbr[^>]*>.*?<\/abbr>/gi, '') // Remover abbrs
      .replace(/<dfn[^>]*>.*?<\/dfn>/gi, '') // Remover dfns
      .replace(/<kbd[^>]*>.*?<\/kbd>/gi, '') // Remover kbds
      .replace(/<samp[^>]*>.*?<\/samp>/gi, '') // Remover samps
      .replace(/<var[^>]*>.*?<\/var>/gi, '') // Remover vars
      .replace(/<code[^>]*>.*?<\/code>/gi, '') // Remover codes
      .replace(/<pre[^>]*>.*?<\/pre>/gi, '') // Remover pres
      .replace(/<del[^>]*>.*?<\/del>/gi, '') // Remover dels
      .replace(/<ins[^>]*>.*?<\/ins>/gi, '') // Remover ins
      .replace(/<s[^>]*>.*?<\/s>/gi, '') // Remover ss
      .replace(/<u[^>]*>.*?<\/u>/gi, '') // Remover us
      .replace(/<small[^>]*>.*?<\/small>/gi, '') // Remover smalls
      .replace(/<sub[^>]*>.*?<\/sub>/gi, '') // Remover subs
      .replace(/<sup[^>]*>.*?<\/sup>/gi, '') // Remover sups
      .replace(/<i[^>]*>.*?<\/i>/gi, '') // Remover is
      .replace(/<b[^>]*>.*?<\/b>/gi, '') // Remover bs
      .replace(/<em[^>]*>.*?<\/em>/gi, '') // Remover ems
      .replace(/<strong[^>]*>.*?<\/strong>/gi, '') // Remover strongs
      .replace(/<span[^>]*>.*?<\/span>/gi, '') // Remover spans
      .replace(/<div[^>]*>.*?<\/div>/gi, '') // Remover divs
      .replace(/<p[^>]*>.*?<\/p>/gi, '') // Remover ps
      .replace(/<br[^>]*>/gi, '') // Remover brs
      .replace(/<hr[^>]*>/gi, '') // Remover hrs
      .replace(/<h1[^>]*>.*?<\/h1>/gi, '') // Remover h1s
      .replace(/<h2[^>]*>.*?<\/h2>/gi, '') // Remover h2s
      .replace(/<h3[^>]*>.*?<\/h3>/gi, '') // Remover h3s
      .replace(/<h4[^>]*>.*?<\/h4>/gi, '') // Remover h4s
      .replace(/<h5[^>]*>.*?<\/h5>/gi, '') // Remover h5s
      .replace(/<h6[^>]*>.*?<\/h6>/gi, '') // Remover h6s
      .replace(/<ul[^>]*>.*?<\/ul>/gi, '') // Remover uls
      .replace(/<ol[^>]*>.*?<\/ol>/gi, '') // Remover ols
      .replace(/<li[^>]*>.*?<\/li>/gi, '') // Remover lis
      .replace(/<dl[^>]*>.*?<\/dl>/gi, '') // Remover dls
      .replace(/<dt[^>]*>.*?<\/dt>/gi, '') // Remover dts
      .replace(/<dd[^>]*>.*?<\/dd>/gi, '') // Remover dds
      .replace(/<table[^>]*>.*?<\/table>/gi, '') // Remover tables
      .replace(/<thead[^>]*>.*?<\/thead>/gi, '') // Remover theads
      .replace(/<tbody[^>]*>.*?<\/tbody>/gi, '') // Remover tbodys
      .replace(/<tfoot[^>]*>.*?<\/tfoot>/gi, '') // Remover tfoots
      .replace(/<tr[^>]*>.*?<\/tr>/gi, '') // Remover trs
      .replace(/<th[^>]*>.*?<\/th>/gi, '') // Remover ths
      .replace(/<td[^>]*>.*?<\/td>/gi, '') // Remover tds
      .replace(/<caption[^>]*>.*?<\/caption>/gi, '') // Remover captions
      .replace(/<colgroup[^>]*>.*?<\/colgroup>/gi, '') // Remover colgroups
      .replace(/<col[^>]*>/gi, '') // Remover cols
      .replace(/<fieldset[^>]*>.*?<\/fieldset>/gi, '') // Remover fieldsets
      .replace(/<legend[^>]*>.*?<\/legend>/gi, '') // Remover legends
      .replace(/<label[^>]*>.*?<\/label>/gi, '') // Remover labels
      .replace(/<optgroup[^>]*>.*?<\/optgroup>/gi, '') // Remover optgroups
      .replace(/<option[^>]*>.*?<\/option>/gi, '') // Remover options
      .replace(/<area[^>]*>/gi, '') // Remover areas
      .replace(/<map[^>]*>.*?<\/map>/gi, '') // Remover maps
      .replace(/<img[^>]*>/gi, '') // Remover imgs
      .replace(/<a[^>]*>.*?<\/a>/gi, '') // Remover as
      .replace(/<title[^>]*>.*?<\/title>/gi, '') // Remover titles
      .replace(/<head[^>]*>.*?<\/head>/gi, '') // Remover heads
      .replace(/<body[^>]*>.*?<\/body>/gi, '') // Remover bodies
      .replace(/<html[^>]*>.*?<\/html>/gi, '') // Remover htmls
      .replace(/<!DOCTYPE[^>]*>/gi, '') // Remover DOCTYPEs
      .replace(/<!--.*?-->/g, '') // Remover comentarios HTML
        .trim();
    
    return sanitized;
  }

  /**
   * Sanitiza un objeto completo
   */
  static sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Middleware para sanitizar request body
   */
  static sanitizeRequestBody(req, res, next) {
    if (req.body) {
      req.body = this.sanitizeObject(req.body);
    }
    next();
  }

  /**
   * Middleware para sanitizar query parameters
   */
  static sanitizeQueryParams(req, res, next) {
    if (req.query) {
      req.query = this.sanitizeObject(req.query);
    }
    next();
  }

  /**
   * Middleware para sanitizar URL parameters
   */
  static sanitizeParams(req, res, next) {
    if (req.params) {
      req.params = this.sanitizeObject(req.params);
    }
    next();
  }

  /**
   * Middleware completo de sanitización XSS
   */
  static xssProtection(req, res, next) {
    // Sanitizar body
    if (req.body) {
      req.body = this.sanitizeObject(req.body);
    }

    // Sanitizar query
    if (req.query) {
      req.query = this.sanitizeObject(req.query);
    }

    // Sanitizar params
    if (req.params) {
      req.params = this.sanitizeObject(req.params);
    }

    // Agregar headers de seguridad
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
  }

  /**
   * Valida que un string no contenga XSS
   */
  static validateNoXSS(input) {
    if (typeof input !== 'string') {
      return true;
    }

    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /<form[^>]*>.*?<\/form>/gi,
      /<input[^>]*>/gi,
      /<textarea[^>]*>.*?<\/textarea>/gi,
      /<select[^>]*>.*?<\/select>/gi,
      /<button[^>]*>.*?<\/button>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:/gi,
      /on\w+\s*=/gi,
      /<link[^>]*>/gi,
      /<meta[^>]*>/gi,
      /<style[^>]*>.*?<\/style>/gi,
      /<base[^>]*>/gi,
      /<applet[^>]*>.*?<\/applet>/gi,
      /<frame[^>]*>.*?<\/frame>/gi,
      /<frameset[^>]*>.*?<\/frameset>/gi,
      /<noframes[^>]*>.*?<\/noframes>/gi,
      /<noscript[^>]*>.*?<\/noscript>/gi,
      /<marquee[^>]*>.*?<\/marquee>/gi,
      /<blink[^>]*>.*?<\/blink>/gi,
      /<keygen[^>]*>/gi,
      /<source[^>]*>/gi,
      /<track[^>]*>/gi,
      /<video[^>]*>.*?<\/video>/gi,
      /<audio[^>]*>.*?<\/audio>/gi,
      /<canvas[^>]*>.*?<\/canvas>/gi,
      /<svg[^>]*>.*?<\/svg>/gi,
      /<math[^>]*>.*?<\/math>/gi,
      /<details[^>]*>.*?<\/details>/gi,
      /<summary[^>]*>.*?<\/summary>/gi,
      /<dialog[^>]*>.*?<\/dialog>/gi,
      /<menu[^>]*>.*?<\/menu>/gi,
      /<menuitem[^>]*>/gi,
      /<command[^>]*>/gi,
      /<datalist[^>]*>.*?<\/datalist>/gi,
      /<output[^>]*>.*?<\/output>/gi,
      /<progress[^>]*>/gi,
      /<meter[^>]*>/gi,
      /<time[^>]*>.*?<\/time>/gi,
      /<mark[^>]*>.*?<\/mark>/gi,
      /<ruby[^>]*>.*?<\/ruby>/gi,
      /<rt[^>]*>.*?<\/rt>/gi,
      /<rp[^>]*>.*?<\/rp>/gi,
      /<bdi[^>]*>.*?<\/bdi>/gi,
      /<bdo[^>]*>.*?<\/bdo>/gi,
      /<wbr[^>]*>/gi,
      /<data[^>]*>.*?<\/data>/gi,
      /<article[^>]*>.*?<\/article>/gi,
      /<aside[^>]*>.*?<\/aside>/gi,
      /<footer[^>]*>.*?<\/footer>/gi,
      /<header[^>]*>.*?<\/header>/gi,
      /<main[^>]*>.*?<\/main>/gi,
      /<nav[^>]*>.*?<\/nav>/gi,
      /<section[^>]*>.*?<\/section>/gi,
      /<figure[^>]*>.*?<\/figure>/gi,
      /<figcaption[^>]*>.*?<\/figcaption>/gi,
      /<hgroup[^>]*>.*?<\/hgroup>/gi,
      /<address[^>]*>.*?<\/address>/gi,
      /<blockquote[^>]*>.*?<\/blockquote>/gi,
      /<cite[^>]*>.*?<\/cite>/gi,
      /<q[^>]*>.*?<\/q>/gi,
      /<abbr[^>]*>.*?<\/abbr>/gi,
      /<dfn[^>]*>.*?<\/dfn>/gi,
      /<kbd[^>]*>.*?<\/kbd>/gi,
      /<samp[^>]*>.*?<\/samp>/gi,
      /<var[^>]*>.*?<\/var>/gi,
      /<code[^>]*>.*?<\/code>/gi,
      /<pre[^>]*>.*?<\/pre>/gi,
      /<del[^>]*>.*?<\/del>/gi,
      /<ins[^>]*>.*?<\/ins>/gi,
      /<s[^>]*>.*?<\/s>/gi,
      /<u[^>]*>.*?<\/u>/gi,
      /<small[^>]*>.*?<\/small>/gi,
      /<sub[^>]*>.*?<\/sub>/gi,
      /<sup[^>]*>.*?<\/sup>/gi,
      /<i[^>]*>.*?<\/i>/gi,
      /<b[^>]*>.*?<\/b>/gi,
      /<em[^>]*>.*?<\/em>/gi,
      /<strong[^>]*>.*?<\/strong>/gi,
      /<span[^>]*>.*?<\/span>/gi,
      /<div[^>]*>.*?<\/div>/gi,
      /<p[^>]*>.*?<\/p>/gi,
      /<br[^>]*>/gi,
      /<hr[^>]*>/gi,
      /<h1[^>]*>.*?<\/h1>/gi,
      /<h2[^>]*>.*?<\/h2>/gi,
      /<h3[^>]*>.*?<\/h3>/gi,
      /<h4[^>]*>.*?<\/h4>/gi,
      /<h5[^>]*>.*?<\/h5>/gi,
      /<h6[^>]*>.*?<\/h6>/gi,
      /<ul[^>]*>.*?<\/ul>/gi,
      /<ol[^>]*>.*?<\/ol>/gi,
      /<li[^>]*>.*?<\/li>/gi,
      /<dl[^>]*>.*?<\/dl>/gi,
      /<dt[^>]*>.*?<\/dt>/gi,
      /<dd[^>]*>.*?<\/dd>/gi,
      /<table[^>]*>.*?<\/table>/gi,
      /<thead[^>]*>.*?<\/thead>/gi,
      /<tbody[^>]*>.*?<\/tbody>/gi,
      /<tfoot[^>]*>.*?<\/tfoot>/gi,
      /<tr[^>]*>.*?<\/tr>/gi,
      /<th[^>]*>.*?<\/th>/gi,
      /<td[^>]*>.*?<\/td>/gi,
      /<caption[^>]*>.*?<\/caption>/gi,
      /<colgroup[^>]*>.*?<\/colgroup>/gi,
      /<col[^>]*>/gi,
      /<fieldset[^>]*>.*?<\/fieldset>/gi,
      /<legend[^>]*>.*?<\/legend>/gi,
      /<label[^>]*>.*?<\/label>/gi,
      /<optgroup[^>]*>.*?<\/optgroup>/gi,
      /<option[^>]*>.*?<\/option>/gi,
      /<area[^>]*>/gi,
      /<map[^>]*>.*?<\/map>/gi,
      /<img[^>]*>/gi,
      /<a[^>]*>.*?<\/a>/gi,
      /<title[^>]*>.*?<\/title>/gi,
      /<head[^>]*>.*?<\/head>/gi,
      /<body[^>]*>.*?<\/body>/gi,
      /<html[^>]*>.*?<\/html>/gi,
      /<!DOCTYPE[^>]*>/gi,
      /<!--.*?-->/g
    ];

    return !xssPatterns.some(pattern => pattern.test(input));
  }
}

export default XSSProtection;