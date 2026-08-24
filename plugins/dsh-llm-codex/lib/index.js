// node_modules/@deepseek-ai/cosmokit/lib/index.js
function isNullable(value) {
  return value === null || value === void 0;
}
function isPlainObject(data) {
  return data && typeof data === "object" && !Array.isArray(data);
}
function filterKeys(object2, filter) {
  return Object.fromEntries(Object.entries(object2).filter(([key, value]) => filter(key, value)));
}
function mapValues(object2, transform) {
  return Object.fromEntries(Object.entries(object2).map(([key, value]) => [key, transform(value, key)]));
}
function pick(source, keys, forced) {
  if (!keys) return { ...source };
  const result = {};
  for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
  return result;
}
function defineProperty(object2, key, value) {
  return Object.defineProperty(object2, key, {
    writable: true,
    value,
    enumerable: false
  });
}
function is(type, value) {
  if (arguments.length === 1) return (value2) => is(type, value2);
  return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
}
function isArrayBufferLike(value) {
  return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
}
function isArrayBufferSource(value) {
  return isArrayBufferLike(value) || ArrayBuffer.isView(value);
}
var Binary;
(function(Binary2) {
  Binary2.is = isArrayBufferLike;
  Binary2.isSource = isArrayBufferSource;
  function fromSource(source) {
    if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
    else return source;
  }
  Binary2.fromSource = fromSource;
  function toBase64(source) {
    source = fromSource(source);
    if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
    let binary = "";
    const bytes = new Uint8Array(source);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  Binary2.toBase64 = toBase64;
  function fromBase64(source) {
    if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
    return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
  }
  Binary2.fromBase64 = fromBase64;
  function toHex(source) {
    source = fromSource(source);
    if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
    return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  Binary2.toHex = toHex;
  function fromHex(source) {
    if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
    const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
    const buffer = [];
    for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
    return Uint8Array.from(buffer).buffer;
  }
  Binary2.fromHex = fromHex;
})(Binary || (Binary = {}));
var base64ToArrayBuffer = Binary.fromBase64;
var arrayBufferToBase64 = Binary.toBase64;
var hexToArrayBuffer = Binary.fromHex;
var arrayBufferToHex = Binary.toHex;
function clone(source, refs = /* @__PURE__ */ new Map()) {
  if (!source || typeof source !== "object") return source;
  if (is("Date", source)) return new Date(source.valueOf());
  if (is("RegExp", source)) return new RegExp(source.source, source.flags);
  if (isArrayBufferLike(source)) return source.slice(0);
  if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  const cached = refs.get(source);
  if (cached) return cached;
  if (Array.isArray(source)) {
    const result2 = [];
    refs.set(source, result2);
    source.forEach((value, index) => {
      result2[index] = Reflect.apply(clone, null, [value, refs]);
    });
    return result2;
  }
  const result = Object.create(Object.getPrototypeOf(source));
  refs.set(source, result);
  for (const key of Reflect.ownKeys(source)) {
    const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
    if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
    Reflect.defineProperty(result, key, descriptor);
  }
  return result;
}
function deepEqual(a, b, strict) {
  if (a === b) return true;
  if (!strict && isNullable(a) && isNullable(b)) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (!a || !b) return false;
  function check(test, then) {
    return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
  }
  return check(Array.isArray, (a2, b2) => a2.length === b2.length && a2.every((item, index) => deepEqual(item, b2[index]))) ?? check(is("Date"), (a2, b2) => a2.valueOf() === b2.valueOf()) ?? check(is("RegExp"), (a2, b2) => a2.source === b2.source && a2.flags === b2.flags) ?? check(isArrayBufferLike, (a2, b2) => {
    if (a2.byteLength !== b2.byteLength) return false;
    const viewA = new Uint8Array(a2);
    const viewB = new Uint8Array(b2);
    for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
    return true;
  }) ?? Object.keys({
    ...a,
    ...b
  }).every((key) => deepEqual(a[key], b[key], strict));
}
function tokenize(source, delimiters, delimiter2) {
  const output = [];
  let state = 0;
  for (let i = 0; i < source.length; i++) {
    const code = source.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      if (state === 1) {
        const next = source.charCodeAt(i + 1);
        if (next >= 97 && next <= 122) output.push(delimiter2);
        output.push(code + 32);
      } else {
        if (state !== 0) output.push(delimiter2);
        output.push(code + 32);
      }
      state = 1;
    } else if (code >= 97 && code <= 122) {
      output.push(code);
      state = 2;
    } else if (delimiters.includes(code)) {
      if (state !== 0) output.push(delimiter2);
      state = 0;
    } else output.push(code);
  }
  return String.fromCharCode(...output);
}
function paramCase(source) {
  return tokenize(source, [45, 95], 45);
}
var hyphenate = paramCase;
var Time;
(function(Time2) {
  Time2.millisecond = 1;
  Time2.second = 1e3;
  Time2.minute = Time2.second * 60;
  Time2.hour = Time2.minute * 60;
  Time2.day = Time2.hour * 24;
  Time2.week = Time2.day * 7;
  let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
  function setTimezoneOffset(offset) {
    timezoneOffset = offset;
  }
  Time2.setTimezoneOffset = setTimezoneOffset;
  function getTimezoneOffset() {
    return timezoneOffset;
  }
  Time2.getTimezoneOffset = getTimezoneOffset;
  function getDateNumber(date2 = /* @__PURE__ */ new Date(), offset) {
    if (typeof date2 === "number") date2 = new Date(date2);
    if (offset === void 0) offset = timezoneOffset;
    return Math.floor((date2.valueOf() / Time2.minute - offset) / 1440);
  }
  Time2.getDateNumber = getDateNumber;
  function fromDateNumber(value, offset) {
    const date2 = new Date(value * Time2.day);
    if (offset === void 0) offset = timezoneOffset;
    return new Date(+date2 + offset * Time2.minute);
  }
  Time2.fromDateNumber = fromDateNumber;
  const numeric = /\d+(?:\.\d+)?/.source;
  const timeRegExp = new RegExp(`^${[
    "w(?:eek(?:s)?)?",
    "d(?:ay(?:s)?)?",
    "h(?:our(?:s)?)?",
    "m(?:in(?:ute)?(?:s)?)?",
    "s(?:ec(?:ond)?(?:s)?)?"
  ].map((unit) => `(${numeric}${unit})?`).join("")}$`);
  function parseTime(source) {
    const capture = timeRegExp.exec(source);
    if (!capture) return 0;
    return (parseFloat(capture[1]) * Time2.week || 0) + (parseFloat(capture[2]) * Time2.day || 0) + (parseFloat(capture[3]) * Time2.hour || 0) + (parseFloat(capture[4]) * Time2.minute || 0) + (parseFloat(capture[5]) * Time2.second || 0);
  }
  Time2.parseTime = parseTime;
  function parseDate(date2) {
    const parsed = parseTime(date2);
    if (parsed) date2 = Date.now() + parsed;
    else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date2)) date2 = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date2}`;
    else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date2)) date2 = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date2}`;
    return date2 ? new Date(date2) : /* @__PURE__ */ new Date();
  }
  Time2.parseDate = parseDate;
  function format(ms) {
    const abs = Math.abs(ms);
    if (abs >= Time2.day - Time2.hour / 2) return Math.round(ms / Time2.day) + "d";
    else if (abs >= Time2.hour - Time2.minute / 2) return Math.round(ms / Time2.hour) + "h";
    else if (abs >= Time2.minute - Time2.second / 2) return Math.round(ms / Time2.minute) + "m";
    else if (abs >= Time2.second) return Math.round(ms / Time2.second) + "s";
    return ms + "ms";
  }
  Time2.format = format;
  function toDigits(source, length = 2) {
    return source.toString().padStart(length, "0");
  }
  Time2.toDigits = toDigits;
  function template(template2, time = /* @__PURE__ */ new Date()) {
    return template2.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
  }
  Time2.template = template;
})(Time || (Time = {}));

// node_modules/@deepseek-ai/schemastery/lib/index.mjs
var kSchema = Symbol.for("schemastery");
var kValidationError = Symbol.for("ValidationError");
globalThis.__schemastery_index__ ??= 0;
globalThis.__schemastery_refs__ = void 0;
var ValidationError = class extends TypeError {
  options;
  name = "ValidationError";
  constructor(message, options) {
    let prefix = "$";
    for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
    else if (typeof segment === "number") prefix += "[" + segment + "]";
    else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
    if (prefix.startsWith(".")) prefix = prefix.slice(1);
    super((prefix === "$" ? "" : `${prefix} `) + message);
    this.options = options;
  }
  static is(error) {
    return !!error?.[kValidationError];
  }
};
Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
var Schema = function(options) {
  const schema = function(data, options2 = {}) {
    return Schema.resolve(data, schema, options2)[0];
  };
  if (options.refs) {
    const refs = mapValues(options.refs, (options2) => new Schema(options2));
    const getRef = (uid) => refs[uid];
    for (const key in refs) {
      const options2 = refs[key];
      options2.sKey = getRef(options2.sKey);
      options2.inner = getRef(options2.inner);
      options2.list = options2.list && options2.list.map(getRef);
      options2.dict = options2.dict && mapValues(options2.dict, getRef);
    }
    return refs[options.uid];
  }
  Object.assign(schema, options);
  if (typeof schema.callback === "string") try {
    schema.callback = new Function("return " + schema.callback)();
  } catch {
  }
  Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
  Object.setPrototypeOf(schema, Schema.prototype);
  schema.meta ||= {};
  schema.toString = schema.toString.bind(schema);
  return schema;
};
Schema.prototype = Object.create(Function.prototype);
Schema.prototype[kSchema] = true;
Object.defineProperty(Schema.prototype, "~standard", { get() {
  return {
    version: 1,
    vendor: "schemastery",
    validate: (value) => {
      try {
        return { value: Schema.resolve(value, this, {})[0] };
      } catch (error) {
        if (ValidationError.is(error)) return { issues: [{
          message: error.message,
          path: error.options.path
        }] };
        throw error;
      }
    }
  };
} });
Schema.ValidationError = ValidationError;
Schema.prototype.toJSON = function toJSON() {
  if (globalThis.__schemastery_refs__) {
    globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
    return this.uid;
  }
  globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
  globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
  const result = {
    uid: this.uid,
    refs: globalThis.__schemastery_refs__
  };
  globalThis.__schemastery_refs__ = void 0;
  return result;
};
Schema.prototype.set = function set(key, value) {
  this.dict[key] = value;
  return this;
};
Schema.prototype.push = function push(value) {
  this.list.push(value);
  return this;
};
function mergeDesc(original, messages) {
  const result = typeof original === "string" ? { "": original } : { ...original };
  for (const locale in messages) {
    const value = messages[locale];
    if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
    else if (typeof value === "string") result[locale] = value;
  }
  return result;
}
function getInner(value) {
  return value?.$value ?? value?.$inner;
}
function extractKeys(data) {
  return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
}
Schema.prototype.i18n = function i18n(messages) {
  const schema = Schema(this);
  const desc = mergeDesc(schema.meta.description, messages);
  if (Object.keys(desc).length) schema.meta.description = desc;
  if (schema.dict) schema.dict = mapValues(schema.dict, (inner, key) => {
    return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
  });
  if (schema.list) schema.list = schema.list.map((inner, index) => {
    return inner.i18n(mapValues(messages, (data = {}) => {
      if (Array.isArray(getInner(data))) return getInner(data)[index];
      if (Array.isArray(data)) return data[index];
      return extractKeys(data);
    }));
  });
  if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
    if (getInner(data)) return getInner(data);
    return extractKeys(data);
  }));
  if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
  return schema;
};
Schema.prototype.extra = function extra(key, value) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key]: value
  };
  return schema;
};
for (const key of [
  "required",
  "disabled",
  "collapse",
  "hidden",
  "loose"
]) Object.assign(Schema.prototype, { [key](value = true) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key]: value
  };
  return schema;
} });
Schema.prototype.deprecated = function deprecated() {
  const schema = Schema(this);
  schema.meta.badges ||= [];
  schema.meta.badges.push({
    text: "deprecated",
    type: "danger"
  });
  return schema;
};
Schema.prototype.experimental = function experimental() {
  const schema = Schema(this);
  schema.meta.badges ||= [];
  schema.meta.badges.push({
    text: "experimental",
    type: "warning"
  });
  return schema;
};
Schema.prototype.pattern = function pattern(regexp) {
  const schema = Schema(this);
  const pattern2 = pick(regexp, ["source", "flags"]);
  schema.meta = {
    ...schema.meta,
    pattern: pattern2
  };
  return schema;
};
Schema.prototype.simplify = function simplify(value) {
  if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
  if (isNullable(value)) return value;
  if (this.type === "object" || this.type === "dict") {
    const result = {};
    for (const key in value) {
      const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
      if (this.type === "dict" || !isNullable(item)) result[key] = item;
    }
    if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
    return result;
  } else if (this.type === "array" || this.type === "tuple") {
    const result = [];
    value.forEach((value2, index) => {
      const schema = this.type === "array" ? this.inner : this.list[index];
      const item = schema ? schema.simplify(value2) : value2;
      result.push(item);
    });
    return result;
  } else if (this.type === "intersect") {
    const result = {};
    for (const item of this.list) Object.assign(result, item.simplify(value));
    return result;
  } else if (this.type === "union") for (const schema of this.list) try {
    Schema.resolve(value, schema, {});
    return schema.simplify(value);
  } catch {
  }
  return value;
};
Schema.prototype.toString = function toString(inline) {
  return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
};
Schema.prototype.role = function role(role, extra2) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    role,
    extra: extra2
  };
  return schema;
};
for (const key of [
  "default",
  "link",
  "comment",
  "description",
  "max",
  "min",
  "step"
]) Object.assign(Schema.prototype, { [key](value) {
  const schema = Schema(this);
  schema.meta = {
    ...schema.meta,
    [key]: value
  };
  return schema;
} });
var resolvers = {};
Schema.extend = function extend(type, resolve4) {
  resolvers[type] = resolve4;
};
Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
  if (!schema) return [data];
  if (options.ignore?.(data, schema)) return [data];
  if (isNullable(data) && schema.type !== "lazy") {
    if (schema.meta.required) throw new ValidationError(`missing required value`, options);
    let current = schema;
    let fallback = schema.meta.default;
    while (current?.type === "intersect" && isNullable(fallback)) {
      current = current.list[0];
      fallback = current?.meta.default;
    }
    if (isNullable(fallback)) return [data];
    data = clone(fallback);
  }
  const callback = resolvers[schema.type];
  if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
  try {
    return callback(data, schema, options, strict);
  } catch (error) {
    if (!schema.meta.loose) throw error;
    return [schema.meta.default];
  }
};
Schema.from = function from(source) {
  if (isNullable(source)) return Schema.any();
  else if ([
    "string",
    "number",
    "boolean"
  ].includes(typeof source)) return Schema.const(source).required();
  else if (source[kSchema]) return source;
  else if (typeof source === "function") switch (source) {
    case String:
      return Schema.string().required();
    case Number:
      return Schema.number().required();
    case Boolean:
      return Schema.boolean().required();
    case Function:
      return Schema.function().required();
    default:
      return Schema.is(source).required();
  }
  else throw new TypeError(`cannot infer schema from ${source}`);
};
Schema.lazy = function lazy(builder) {
  const toJSON2 = () => {
    if (!schema.inner[kSchema]) {
      schema.inner = schema.builder();
      schema.inner.meta = {
        ...schema.meta,
        ...schema.inner.meta
      };
    }
    return schema.inner.toJSON();
  };
  const schema = new Schema({
    type: "lazy",
    builder,
    inner: { toJSON: toJSON2 }
  });
  return schema;
};
Schema.natural = function natural() {
  return Schema.number().step(1).min(0);
};
Schema.percent = function percent() {
  return Schema.number().step(0.01).min(0).max(1).role("slider");
};
Schema.date = function date() {
  return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
    const date2 = new Date(value);
    if (isNaN(+date2)) throw new ValidationError(`invalid date "${value}"`, options);
    return date2;
  }, true)]);
};
Schema.regExp = function regExp(flag = "") {
  return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
    try {
      return new RegExp(value, flag);
    } catch (e) {
      throw new ValidationError(e.message, options);
    }
  }, true)]);
};
Schema.arrayBuffer = function arrayBuffer(encoding) {
  return Schema.union([
    Schema.is(ArrayBuffer),
    Schema.is(SharedArrayBuffer),
    Schema.transform(Schema.any(), (value, options) => {
      if (Binary.isSource(value)) return Binary.fromSource(value);
      throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
    }, true),
    ...encoding ? [Schema.transform(Schema.string(), (value, options) => {
      try {
        return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
      } catch (e) {
        throw new ValidationError(e.message, options);
      }
    }, true)] : []
  ]);
};
Schema.extend("lazy", (data, schema, options, strict) => {
  if (!schema.inner[kSchema]) {
    schema.inner = schema.builder();
    schema.inner.meta = {
      ...schema.meta,
      ...schema.inner.meta
    };
  }
  return Schema.resolve(data, schema.inner, options, strict);
});
Schema.extend("any", (data) => {
  return [data];
});
Schema.extend("never", (data, _, options) => {
  throw new ValidationError(`expected nullable but got ${data}`, options);
});
Schema.extend("const", (data, { value }, options) => {
  if (deepEqual(data, value)) return [value];
  throw new ValidationError(`expected ${value} but got ${data}`, options);
});
function checkWithinRange(data, meta, description, options, skipMin = false) {
  const { max = Infinity, min = -Infinity } = meta;
  if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
  if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
}
Schema.extend("string", (data, { meta }, options) => {
  if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
  if (meta.pattern) {
    const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
    if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
  }
  checkWithinRange(data.length, meta, "string length", options);
  return [data];
});
function decimalShift(data, digits) {
  const str = data.toString();
  if (str.includes("e")) return data * Math.pow(10, digits);
  const index = str.indexOf(".");
  if (index === -1) return data * Math.pow(10, digits);
  const frac = str.slice(index + 1);
  const integer = str.slice(0, index);
  if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
  return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
}
function isMultipleOf(data, min, step) {
  step = Math.abs(step);
  if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
  const index = step.toString().indexOf(".");
  const digits = step.toString().slice(index + 1).length;
  return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
}
Schema.extend("number", (data, { meta }, options) => {
  if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
  checkWithinRange(data, meta, "number", options);
  const { step } = meta;
  if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
  return [data];
});
Schema.extend("boolean", (data, _, options) => {
  if (typeof data === "boolean") return [data];
  throw new ValidationError(`expected boolean but got ${data}`, options);
});
Schema.extend("bitset", (data, { bits, meta }, options) => {
  let value = 0, keys = [];
  if (typeof data === "number") {
    value = data;
    for (const key in bits) if (data & bits[key]) keys.push(key);
  } else if (Array.isArray(data)) {
    keys = data;
    for (const key of keys) {
      if (typeof key !== "string") throw new ValidationError(`expected string but got ${key}`, options);
      if (key in bits) value |= bits[key];
    }
  } else throw new ValidationError(`expected number or array but got ${data}`, options);
  if (value === meta.default) return [value];
  return [value, keys];
});
Schema.extend("function", (data, _, options) => {
  if (typeof data === "function") return [data];
  throw new ValidationError(`expected function but got ${data}`, options);
});
Schema.extend("is", (data, { constructor }, options) => {
  if (typeof constructor === "function") {
    if (data instanceof constructor) return [data];
    throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
  } else {
    if (isNullable(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
    let prototype = Object.getPrototypeOf(data);
    while (prototype) {
      if (prototype.constructor?.name === constructor) return [data];
      prototype = Object.getPrototypeOf(prototype);
    }
    throw new ValidationError(`expected ${constructor} but got ${data}`, options);
  }
});
function property(data, key, schema, options) {
  try {
    const [value, adapted] = Schema.resolve(data[key], schema, {
      ...options,
      path: [...options.path || [], key]
    });
    if (adapted !== void 0) data[key] = adapted;
    return value;
  } catch (e) {
    if (!options?.autofix) throw e;
    delete data[key];
    return schema.meta.default;
  }
}
Schema.extend("array", (data, { inner, meta }, options) => {
  if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
  checkWithinRange(data.length, meta, "array length", options, !isNullable(inner.meta.default));
  return [data.map((_, index) => property(data, index, inner, options))];
});
Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
  if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
  const result = {};
  for (const key in data) {
    let rKey;
    try {
      rKey = Schema.resolve(key, sKey, options)[0];
    } catch (error) {
      if (strict) continue;
      throw error;
    }
    result[rKey] = property(data, key, inner, options);
    data[rKey] = data[key];
    if (key !== rKey) delete data[key];
  }
  return [result];
});
Schema.extend("tuple", (data, { list }, options, strict) => {
  if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
  const result = list.map((inner, index) => property(data, index, inner, options));
  if (strict) return [result];
  result.push(...data.slice(list.length));
  return [result];
});
function merge(result, data) {
  for (const key in data) {
    if (key in result) continue;
    result[key] = data[key];
  }
}
Schema.extend("object", (data, { dict }, options, strict) => {
  if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
  const result = {};
  for (const key in dict) {
    const value = property(data, key, dict[key], options);
    if (!isNullable(value) || key in data) result[key] = value;
  }
  if (!strict) merge(result, data);
  return [result];
});
Schema.extend("union", (data, { list, toString: toString2 }, options, strict) => {
  const messages = [];
  for (const inner of list) try {
    return Schema.resolve(data, inner, options, strict);
  } catch (error) {
    messages.push(error);
  }
  throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
});
Schema.extend("intersect", (data, { list, toString: toString2 }, options, strict) => {
  if (!list.length) return [data];
  let result;
  for (const inner of list) {
    const value = Schema.resolve(data, inner, options, true)[0];
    if (isNullable(value)) continue;
    if (isNullable(result)) result = value;
    else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
    else if (typeof value === "object") merge(result ??= {}, value);
    else if (result !== value) throw new ValidationError(`expected ${toString2()} but got ${JSON.stringify(data)}`, options);
  }
  if (!strict && isPlainObject(data)) merge(result, data);
  return [result];
});
Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
  const [result, adapted = data] = Schema.resolve(data, inner, options, true);
  if (preserve) return [callback(result)];
  else return [callback(result), callback(adapted)];
});
var formatters = {};
function defineMethod(name2, keys, format) {
  formatters[name2] = format;
  Object.assign(Schema, { [name2](...args) {
    const schema = new Schema({ type: name2 });
    keys.forEach((key, index) => {
      switch (key) {
        case "sKey":
          schema.sKey = args[index] ?? Schema.string();
          break;
        case "inner":
          schema.inner = Schema.from(args[index]);
          break;
        case "list":
          schema.list = args[index].map(Schema.from);
          break;
        case "dict":
          schema.dict = mapValues(args[index], Schema.from);
          break;
        case "bits":
          schema.bits = {};
          for (const key2 in args[index]) {
            if (typeof args[index][key2] !== "number") continue;
            schema.bits[key2] = args[index][key2];
          }
          break;
        case "callback": {
          const callback = schema.callback = args[index];
          callback["toJSON"] ||= () => callback.toString();
          break;
        }
        case "constructor": {
          const constructor = schema.constructor = args[index];
          if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
          break;
        }
        default:
          schema[key] = args[index];
      }
    });
    if (name2 === "object" || name2 === "dict") schema.meta.default = {};
    else if (name2 === "array" || name2 === "tuple") schema.meta.default = [];
    else if (name2 === "bitset") schema.meta.default = 0;
    return schema;
  } });
}
defineMethod("is", ["constructor"], ({ constructor }) => {
  if (typeof constructor === "function") return constructor.name;
  else return constructor;
});
defineMethod("any", [], () => "any");
defineMethod("never", [], () => "never");
defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
defineMethod("string", [], () => "string");
defineMethod("number", [], () => "number");
defineMethod("boolean", [], () => "boolean");
defineMethod("bitset", ["bits"], () => "bitset");
defineMethod("function", [], () => "function");
defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
defineMethod("object", ["dict"], ({ dict }) => {
  if (Object.keys(dict).length === 0) return "{}";
  return `{ ${Object.entries(dict).map(([key, inner]) => {
    return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
  }).join(", ")} }`;
});
defineMethod("union", ["list"], ({ list }, inline) => {
  const result = list.map(({ toString: format }) => format()).join(" | ");
  return inline ? `(${result})` : result;
});
defineMethod("intersect", ["list"], ({ list }) => {
  return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
});
defineMethod("transform", [
  "inner",
  "callback",
  "preserve"
], ({ inner }, isInner) => inner.toString(isInner));

// node_modules/@deepseek-ai/cordis/lib/index.js
var DisposableList = class {
  sn = 0;
  map = /* @__PURE__ */ new Map();
  weak = /* @__PURE__ */ new WeakMap();
  get length() {
    return this.map.size;
  }
  push(value) {
    const sn = ++this.sn;
    this.map.set(sn, value);
    this.weak.set(value, sn);
    return () => this.map.delete(sn);
  }
  delete(value) {
    const sn = this.weak.get(value);
    if (!sn) return false;
    return this.map.delete(sn);
  }
  clear() {
    const values = [...this.map.values()];
    this.map.clear();
    return values.reverse();
  }
  [Symbol.iterator]() {
    return this.map.values();
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return [...this];
  }
};
var symbols = {
  shadow: Symbol.for("cordis.shadow"),
  receiver: Symbol.for("cordis.receiver"),
  original: Symbol.for("cordis.original"),
  metadata: Symbol.for("cordis.metadata"),
  initHooks: Symbol.for("cordis.initHooks"),
  checkProto: Symbol.for("cordis.checkProto"),
  effect: Symbol.for("cordis.effect"),
  filter: Symbol.for("cordis.filter"),
  isolate: Symbol.for("cordis.isolate"),
  intercept: Symbol.for("cordis.intercept"),
  init: Symbol.for("cordis.init"),
  check: Symbol.for("cordis.check"),
  config: Symbol.for("cordis.config"),
  invoke: Symbol.for("cordis.invoke"),
  extend: Symbol.for("cordis.extend"),
  tracker: Symbol.for("cordis.tracker"),
  resolveConfig: Symbol.for("cordis.resolveConfig")
};
var GeneratorFunction = function* () {
}.constructor;
var AsyncGeneratorFunction = async function* () {
}.constructor;
function isConstructor(func) {
  if (!func.prototype) return false;
  if (func instanceof GeneratorFunction) return false;
  if (AsyncGeneratorFunction !== Function && func instanceof AsyncGeneratorFunction) return false;
  return true;
}
function joinPrototype(proto1, proto2) {
  if (proto1 === Object.prototype) return proto2;
  const result = Object.create(joinPrototype(Object.getPrototypeOf(proto1), proto2));
  for (const key of Reflect.ownKeys(proto1)) Object.defineProperty(result, key, Object.getOwnPropertyDescriptor(proto1, key));
  return result;
}
function isObject(value) {
  return value && (typeof value === "object" || typeof value === "function");
}
function getPropertyDescriptor(target, prop) {
  let proto = target;
  while (proto) {
    const desc = Reflect.getOwnPropertyDescriptor(proto, prop);
    if (desc) return desc;
    proto = Object.getPrototypeOf(proto);
  }
}
function getTraceable(ctx, value) {
  if (!isObject(value)) return value;
  if (Object.hasOwn(value, symbols.shadow)) return Object.getPrototypeOf(value);
  const tracker = value[symbols.tracker];
  if (!tracker) return value;
  return createTraceable(ctx, value, tracker);
}
function withProps(target, props) {
  if (!props) return target;
  return new Proxy(target, {
    get: (target2, prop, receiver) => {
      if (prop in props && prop !== "constructor") return Reflect.get(props, prop, receiver);
      return Reflect.get(target2, prop, receiver);
    },
    set: (target2, prop, value, receiver) => {
      if (prop in props && prop !== "constructor") return Reflect.set(props, prop, value, receiver);
      return Reflect.set(target2, prop, value, receiver);
    }
  });
}
function withProp(target, prop, value) {
  return withProps(target, Object.defineProperty(/* @__PURE__ */ Object.create(null), prop, {
    value,
    writable: false
  }));
}
function createShadow(ctx, target, property2, receiver) {
  if (!property2) return receiver;
  const origin = Reflect.getOwnPropertyDescriptor(target, property2)?.value;
  if (!origin) return receiver;
  return withProp(receiver, property2, ctx.extend({ [symbols.shadow]: origin }));
}
function createShadowMethod(ctx, value, outer, shadow) {
  return new Proxy(value, { apply: (target, thisArg, args) => {
    if (thisArg === outer) thisArg = shadow;
    return getTraceable(ctx, Reflect.apply(target, thisArg, args));
  } });
}
function createTraceable(ctx, value, tracker) {
  if (ctx[symbols.shadow] && !tracker.noShadow) ctx = Object.getPrototypeOf(ctx);
  const proxy = new Proxy(value, {
    get: (target, prop, receiver) => {
      if (prop === symbols.original) return target;
      if (prop === tracker.property) return ctx;
      if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
      if (tracker.associate && ctx.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.get(ctx, `${tracker.associate}.${prop}`, withProp(ctx, symbols.receiver, receiver));
      let shadow, innerValue;
      const desc = getPropertyDescriptor(target, prop);
      if (desc && "value" in desc) innerValue = desc.value;
      else {
        shadow = createShadow(ctx, target, tracker.property, receiver);
        innerValue = Reflect.get(target, prop, shadow);
      }
      const innerTracker = innerValue?.[symbols.tracker];
      if (innerTracker) return createTraceable(ctx, innerValue, innerTracker);
      else if (!tracker.noShadow && typeof innerValue === "function") {
        shadow ??= createShadow(ctx, target, tracker.property, receiver);
        return createShadowMethod(ctx, innerValue, receiver, shadow);
      } else return innerValue;
    },
    set: (target, prop, value2, receiver) => {
      if (prop === symbols.original) return false;
      if (prop === tracker.property) return false;
      if (typeof prop === "symbol") return Reflect.set(target, prop, value2, receiver);
      if (tracker.associate && ctx.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.set(ctx, `${tracker.associate}.${prop}`, value2, withProp(ctx, symbols.receiver, receiver));
      const shadow = createShadow(ctx, target, tracker.property, receiver);
      return Reflect.set(target, prop, value2, shadow);
    },
    apply: (target, thisArg, args) => {
      return applyTraceable(proxy, target, thisArg, args);
    }
  });
  return proxy;
}
function applyTraceable(proxy, value, thisArg, args) {
  if (!value[symbols.invoke]) return Reflect.apply(value, thisArg, args);
  return value[symbols.invoke].apply(proxy, args);
}
function createCallable(name2, proto, tracker) {
  const self = function(...args) {
    return applyTraceable(createTraceable(self["ctx"], self, tracker), self, this, args);
  };
  defineProperty(self, "name", name2);
  return Object.setPrototypeOf(self, proto);
}
function handleError(info, reason, getOuterStack) {
  const innerLines = info.error.stack.split("\n");
  if (typeof reason?.stack !== "string") {
    const outerError = new Error(reason);
    const lines2 = outerError.stack.split("\n");
    lines2.splice(1, Infinity, ...getOuterStack());
    outerError.stack = lines2.join("\n");
    throw outerError;
  }
  const lines = reason.stack.split("\n");
  let index = lines.indexOf(innerLines[2]);
  if (index === -1) throw reason;
  index -= info.offset;
  while (index > 0) {
    if (!lines[index - 1].endsWith(" (<anonymous>)")) break;
    index -= 1;
  }
  lines.splice(index, Infinity, ...getOuterStack());
  reason.stack = lines.join("\n");
  throw reason;
}
function composeError(callback, getOuterStack = buildOuterStack()) {
  const info = {
    offset: 1,
    error: /* @__PURE__ */ new Error()
  };
  try {
    const result = callback(info);
    if (isObject(result) && "then" in result) return result.then(void 0, (reason) => handleError(info, reason, getOuterStack));
    else return result;
  } catch (reason) {
    handleError(info, reason, getOuterStack);
  }
}
function buildOuterStack(offset = 0) {
  const outerError = /* @__PURE__ */ new Error();
  return () => outerError.stack.split("\n").slice(3 + offset);
}
function isBailed(value) {
  return value !== null && value !== false && value !== void 0;
}
var EventsService = class {
  ctx;
  _hooks = {};
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols.tracker, {
      property: "ctx",
      noShadow: true
    });
    this.on("internal/listener", function(name2, listener, options) {
      if (name2 === "internal/update" && !options.global) return (this.fiber._hooks["internal/update"] ??= new DisposableList())[options.prepend ? "unshift" : "push"](listener);
    });
    this.on("internal/update", function(config, noSave, next) {
      const cbs = [...this._hooks["internal/update"] || []];
      const _next = () => {
        return (cbs.shift() ?? next).call(this, config, noSave, _next);
      };
      return _next();
    }, {
      global: true,
      prepend: true
    });
  }
  /**
  * Resolve listeners for one dispatch and apply context filtering.
  *
  * @param type — the dispatch mode, reported on `internal/dispatch`.
  * @param args — the raw dispatch arguments; consumed up to the event name.
  * @returns the matching listener callbacks, bound to the dispatch `this`.
  */
  dispatch(type, args) {
    const thisArg = typeof args[0] === "object" || typeof args[0] === "function" ? args.shift() : null;
    const name2 = args.shift();
    if (!name2.startsWith("internal/")) this.emit("internal/dispatch", type, name2, args, thisArg);
    const filter = thisArg?.[Context.filter];
    return (this._hooks[name2] || []).filter((hook) => hook.global || !filter || filter.call(thisArg, hook.ctx)).map((hook) => hook.callback.bind(thisArg));
  }
  /**
  * Run listeners concurrently and wait for all of them.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  * @returns a promise resolving once every listener has settled.
  */
  async parallel(...args) {
    const errors = (await Promise.allSettled(this.dispatch("emit", args).map(async (cb) => cb(...args)))).filter((result) => result.status === "rejected");
    if (errors.length) throw new AggregateError(errors.map((error) => error.reason));
  }
  /**
  * Run listeners synchronously without waiting for returned promises.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  */
  emit(...args) {
    this.dispatch("emit", args).map((cb) => cb(...args));
  }
  /**
  * Run listeners in order, awaiting each, until one returns a bail value.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  * @returns the first bail value (see {@link isBailed}), if any.
  */
  async serial(...args) {
    for (const cb of this.dispatch("serial", args)) {
      const result = await cb(...args);
      if (isBailed(result)) return result;
    }
  }
  /**
  * Run listeners synchronously until one returns a bail value.
  *
  * @param args — optional `this`, the event name, then listener arguments.
  * @returns the first bail value (see {@link isBailed}), if any.
  */
  bail(...args) {
    for (const cb of this.dispatch("bail", args)) {
      const result = cb(...args);
      if (isBailed(result)) return result;
    }
  }
  /**
  * Compose listeners around the final `next` callback.
  *
  * The last dispatch argument is treated as the innermost `next`. Listeners
  * run outermost-first; a listener that does not call `next()` vetoes the
  * rest of the chain, including the built-in behavior.
  *
  * @param args — optional `this`, the event name, listener arguments, then `next`.
  * @returns the outermost listener's return value.
  */
  waterfall(...args) {
    const cbs = this.dispatch("waterfall", args);
    const inner = args.pop();
    const next = () => {
      return (cbs.shift() ?? inner)(...args);
    };
    args.push(next);
    return next();
  }
  /**
  * Store a listener record as an effect on the current fiber.
  *
  * @param label — effect label shown in fiber diagnostics.
  * @param hooks — the listener list for one event.
  * @param callback — the listener to store.
  * @param options — placement and filtering options.
  * @returns a disposer that unregisters the listener.
  */
  register(label, hooks, callback, options) {
    const method = options.prepend ? "unshift" : "push";
    return this.ctx.fiber.effect(() => {
      hooks[method]({
        ctx: this.ctx,
        callback,
        ...options
      });
      return () => this.unregister(hooks, callback);
    }, label);
  }
  /**
  * Remove a stored listener record.
  *
  * @param hooks — the listener list for one event.
  * @param callback — the listener to remove.
  * @returns `true` if the listener was found and removed.
  */
  unregister(hooks, callback) {
    const index = hooks.findIndex((hook) => hook.callback === callback);
    if (index >= 0) {
      hooks.splice(index, 1);
      return true;
    }
  }
  /**
  * Register an event listener owned by the current fiber.
  *
  * The listener is removed automatically when the fiber unloads. Throws
  * `CordisError('INACTIVE_EFFECT')` if the fiber is already disposed.
  *
  * @param name — the event name to listen for.
  * @param listener — called with the dispatch arguments.
  * @param options — listener options; a boolean is shorthand for `prepend`.
  * @returns a disposer removing the listener; `true` if it was still registered.
  */
  on(name2, listener, options) {
    if (typeof options !== "object") options = { prepend: options };
    this.ctx.fiber.assertActive();
    listener = this.ctx.reflect.bind(listener);
    const result = this.bail(this.ctx, "internal/listener", name2, listener, options);
    if (result) return result;
    const hooks = this._hooks[name2] ||= [];
    const label = `ctx.on(${typeof name2 === "string" ? JSON.stringify(name2) : name2.toString()})`;
    return this.register(label, hooks, listener, options);
  }
  /**
  * Register an event listener that disposes itself after the first call.
  *
  * @param name — the event name to listen for.
  * @param listener — called at most once with the dispatch arguments.
  * @param options — listener options; a boolean is shorthand for `prepend`.
  * @returns a disposer removing the listener; `true` if it was still registered.
  */
  once(name2, listener, options) {
    const dispose = this.on(name2, function(...args) {
      dispose();
      return listener.apply(this, args);
    }, options);
    return dispose;
  }
};
var defaultFormatters = {
  s: (value) => String(value),
  d: (value) => Math.trunc(Number(value)),
  i: (value) => Math.trunc(Number(value)),
  f: (value) => Number(value),
  o: (value) => JSON.stringify(value),
  O: (value) => JSON.stringify(value),
  c: () => "",
  C: (value, exporter, message) => {
    return Logger.color(exporter, Logger.code(message.name, exporter.colors), value);
  }
};
function isAggregateError(error) {
  return error instanceof Error && Array.isArray(error["errors"]);
}
var Logger = class {
  service;
  static color(exporter, code, value, decoration = "") {
    if (!exporter.colors) return "" + value;
    return `\x1B[3${code < 8 ? code : "8;5;" + code}${exporter.colors >= 2 ? decoration : ""}m${value}\x1B[0m`;
  }
  static code(name2, level) {
    let hash = 0;
    for (let i = 0; i < name2.length; i++) {
      hash = (hash << 3) - hash + name2.charCodeAt(i) + 13;
      hash |= 0;
    }
    const colors = !level ? [] : level >= 2 ? c256 : c16;
    return colors[Math.abs(hash) % colors.length];
  }
  static format(exporter, message) {
    const args = message.args.slice();
    if (args[0] instanceof Error) {
      args[0] = args[0].stack || args[0].message;
      args.unshift("%s");
    } else if (typeof args[0] !== "string") args.unshift("%o");
    let format = args.shift();
    format = format.replace(/%([a-zA-Z%])/g, (match, char) => {
      if (match === "%%") return "%";
      const formatter = exporter.formatters?.[char] ?? defaultFormatters[char];
      if (typeof formatter === "function") return formatter(args.shift(), exporter, message);
      return match;
    });
    const oFormatter = exporter.formatters?.o ?? defaultFormatters.o;
    for (let arg of args) {
      if (typeof arg === "object" && arg) arg = oFormatter(arg, exporter, message);
      format += " " + arg;
    }
    const { maxLength = 10240 } = exporter;
    return format.split(/\r?\n/g).map((line) => {
      return line.slice(0, maxLength) + (line.length > maxLength ? "..." : "");
    }).join("\n");
  }
  constructor(options, service) {
    this.service = service;
    Object.assign(this, options);
    this.error = this._method("error", 0);
    this.info = this._method("info", 1);
    this.warn = this._method("warn", 2);
    this.debug = this._method("debug", 3);
  }
  _method(type, level) {
    return (...args) => {
      if (args.length === 1 && args[0] instanceof Error) {
        if (args[0].cause) this[type](args[0].cause);
        else if (isAggregateError(args[0])) {
          args[0].errors.forEach((error) => this[type](error));
          return;
        }
      }
      const sn = ++this.service._snMessage;
      const ts = Date.now();
      for (const exporter of this.service.exporters.values()) {
        if ((exporter.levels?.[this.name] ?? exporter.levels?.default ?? this.level ?? 1) < level) continue;
        const message = {
          sn,
          ts,
          type,
          level,
          name: this.name,
          ...this.meta,
          args
        };
        exporter.export(message);
      }
    };
  }
};
var c16 = [
  6,
  2,
  3,
  4,
  5,
  1
];
var c256 = [
  20,
  21,
  26,
  27,
  32,
  33,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  56,
  57,
  62,
  63,
  68,
  69,
  74,
  75,
  76,
  77,
  78,
  79,
  80,
  81,
  92,
  93,
  98,
  99,
  112,
  113,
  129,
  134,
  135,
  148,
  149,
  160,
  161,
  162,
  163,
  164,
  165,
  166,
  167,
  168,
  169,
  170,
  171,
  172,
  173,
  178,
  179,
  184,
  185,
  196,
  197,
  198,
  199,
  200,
  201,
  202,
  203,
  204,
  205,
  206,
  207,
  208,
  209,
  214,
  215,
  220,
  221
];
var LoggerService = class LoggerService2 {
  bufferSize = 1e3;
  buffer = [];
  ctx;
  _snMessage = 0;
  _snExporter = 0;
  exporters = /* @__PURE__ */ new Map();
  constructor(ctx) {
    const tracker = {
      property: "ctx",
      noShadow: true
    };
    const self = createCallable("logger", joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
    Object.assign(self, this);
    self.ctx = ctx;
    defineProperty(self, symbols.tracker, tracker);
    self.exporter({
      colors: 3,
      export: (message) => {
        self.buffer.push(message);
        if (self.buffer.length > self.bufferSize) self.buffer = self.buffer.slice(-self.bufferSize);
      }
    });
    return self;
  }
  /**
  * Register an exporter and dispose it with the current fiber.
  *
  * @param exporter — the sink that receives structured log messages.
  * @returns a disposer that removes the exporter.
  */
  exporter(exporter) {
    return this.ctx.effect(() => {
      this.exporters.set(++this._snExporter, exporter);
      return () => this.exporters.delete(this._snExporter);
    }, "ctx.logger.exporter()");
  }
  _resolveConfig() {
    let intercept = this.ctx[symbols.intercept];
    const configs = [];
    while ("logger" in intercept) {
      if (Object.hasOwn(intercept, "logger")) configs.unshift(intercept["logger"]);
      intercept = Object.getPrototypeOf(intercept);
    }
    return Object.assign({}, ...configs);
  }
  [symbols.invoke](name2) {
    const config = this._resolveConfig();
    const fiber = (this.ctx[symbols.shadow] ?? this.ctx).fiber;
    name2 ??= config.name;
    name2 ??= hyphenate(fiber.name);
    return new Logger({
      name: name2,
      level: config.level,
      meta: { fiber: new WeakRef(fiber) }
    }, this);
  }
  static {
    for (const type of [
      "error",
      "info",
      "warn",
      "debug"
    ]) LoggerService2.prototype[type] = function(...args) {
      return this()[type](...args);
    };
  }
};
function enhanceError(error) {
  const lines = error.stack.split("\n");
  lines.splice(0, 2, `Error: ${error.message}`);
  error.stack = lines.join("\n");
  return error;
}
var RESERVED_WORDS = ["prototype", "then"];
function isSpecialProperty(prop) {
  return typeof prop === "symbol" || RESERVED_WORDS.includes(prop) || parseInt(prop).toString() === prop || prop.startsWith("_");
}
var ReflectService = class {
  ctx;
  /** Proxy traps implementing service resolution for every context object. */
  static handler = {
    get: (target, prop, ctx) => {
      if (isSpecialProperty(prop)) return Reflect.get(target, prop, ctx);
      if (Reflect.has(target, prop)) return getTraceable(ctx, Reflect.get(target, prop, ctx));
      const error = /* @__PURE__ */ new Error(`cannot get property "${prop}" without inject`);
      try {
        const def = target.reflect.props[prop];
        if (def?.type === "accessor") return def.get.call(ctx, ctx[symbols.receiver], error);
        if (!ctx.fiber.runtime) return ctx.reflect.get(prop, false);
        return ctx.events.waterfall("internal/get", ctx, prop, error, () => {
          const key = target[symbols.isolate][prop];
          let fiber = (ctx[symbols.shadow] ?? ctx).fiber;
          while (true) {
            const impl = fiber.store?.[prop];
            if (impl) return getTraceable(ctx, impl.value);
            if (prop in fiber.inject) {
              error.message = `cannot get required service "${prop}" in inactive context`;
              throw error;
            }
            if (!fiber.runtime) throw error;
            if (fiber.parent[symbols.isolate][prop] !== key) throw error;
            fiber = fiber.parent.fiber;
          }
        });
      } catch (e) {
        throw e === error ? enhanceError(e) : e;
      }
    },
    set: (target, prop, value, ctx) => {
      if (isSpecialProperty(prop)) return Reflect.set(target, prop, value, ctx);
      const error = /* @__PURE__ */ new Error(`cannot set property "${prop}" without provide`);
      const def = target.reflect.props[prop];
      if (!def) {
        if (!ctx.fiber.runtime) return Reflect.set(target, prop, value, ctx);
        throw enhanceError(error);
      }
      try {
        if (def.type === "accessor") {
          if (!def.set) return false;
          return def.set.call(ctx, value, ctx[symbols.receiver], error);
        }
        return ctx.events.waterfall("internal/set", ctx, prop, value, error, () => {
          return ctx.reflect.set(prop, value, error);
        });
      } catch (e) {
        throw e === error ? enhanceError(e) : e;
      }
    },
    has: (target, prop) => {
      if (isSpecialProperty(prop)) return Reflect.has(target, prop);
      if (Reflect.has(target, prop)) return true;
      return !!target.reflect.props[prop];
    }
  };
  /** Service implementations, keyed by isolation label. */
  store = /* @__PURE__ */ Object.create(null);
  /** Declared context properties (services and accessors), by name. */
  props = /* @__PURE__ */ Object.create(null);
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols.tracker, {
      property: "ctx",
      noShadow: true
    });
    this.mixin("reflect", [
      "get",
      "set",
      "provide",
      "accessor",
      "mixin"
    ]);
    this.mixin("fiber", ["runtime", "effect"]);
    this.mixin("registry", ["inject", "plugin"]);
    this.mixin("events", [
      "on",
      "once",
      "parallel",
      "emit",
      "serial",
      "bail",
      "waterfall"
    ]);
  }
  /**
  * Read a service from the store without the inject requirement.
  *
  * @param name — the service name.
  * @param strict — when `true`, only return implementations whose providing
  * fiber is currently active.
  * @returns the service value, or `undefined` when not (yet) provided.
  */
  get(name2, strict = true) {
    return getTraceable(this.ctx, this._getImpl(name2, strict)?.value);
  }
  _getImpl(name2, strict = true) {
    const key = this.ctx[symbols.isolate][name2];
    const impl = key && this.store[key];
    if (!impl) return;
    if (strict && impl.fiber.state !== 2) return;
    return impl;
  }
  /**
  * Overwrite a provided service's value.
  *
  * @param name — the service name.
  * @param value — the new service value.
  * @param error — carrier for the caller stack in diagnostics.
  * @returns `true` on success.
  * @throws when `name` was never provided, or was provided by another fiber.
  */
  set(name2, value, error) {
    const key = this.ctx[symbols.isolate][name2];
    const impl = this.store[key];
    if (!impl) throw new Error(`cannot set property "${name2}" without provide`);
    if (impl.fiber !== this.ctx.fiber) throw new Error(`cannot set property "${name2}" in multiple fibers`);
    impl.value = value;
    return true;
  }
  /**
  * Register a service implementation owned by the current fiber.
  *
  * See the `ctx.provide()` overload above for the full contract.
  *
  * @param name — the service name.
  * @param value — the service value.
  * @param check — optional availability predicate for dependents.
  * @returns a disposer that unregisters the service.
  */
  provide(name2, value, check) {
    return this.ctx.fiber.effect(() => {
      if (!this.props[name2]) this.props[name2] ??= { type: "service" };
      else if (this.props[name2].type !== "service") throw new Error(`property "${name2}" is already declared as ${this.props[name2].type}`);
      this.props[name2] = { type: "service" };
      this.ctx.root[symbols.isolate][name2] ??= Symbol(name2);
      const key = this.ctx[symbols.isolate][name2];
      const impl = {
        name: name2,
        value,
        fiber: this.ctx.fiber,
        check
      };
      if (this.store[key]) throw new Error(`service "${name2}" has been registered at <${this.store[key].fiber.name}>`);
      this.store[key] = impl;
      this.ctx.fiber.store[name2] = impl;
      if (this.ctx.fiber.state === 2) this.notify([name2]);
      return async () => {
        delete this.store[key];
        const fibers = this.notify([name2]);
        await Promise.allSettled(fibers.map((fiber) => fiber.await()));
        delete this.ctx.fiber.store[name2];
      };
    }, `ctx.provide(${JSON.stringify(name2)})`);
  }
  /**
  * Re-evaluate every fiber that requires one of the given services.
  *
  * @param names — the service names that changed.
  * @param filter — restricts notification to matching isolation scopes.
  * @returns the fibers whose dependency state was refreshed.
  */
  notify(names, filter = (ctx, name2) => ctx[symbols.isolate][name2] === this.ctx[symbols.isolate][name2]) {
    const fibers = [];
    for (const runtime of this.ctx.registry.values()) for (const fiber of runtime.fibers) {
      let hasUpdate = false;
      for (const name2 of names) {
        if (!(name2 in fiber.inject)) continue;
        if (!filter(fiber.ctx, name2)) continue;
        hasUpdate = true;
        fiber._checkImpl(name2);
      }
      if (!hasUpdate) continue;
      fiber._refresh();
      fibers.push(fiber);
    }
    for (const name2 of names) {
      const self = Object.create(this.ctx);
      self[symbols.filter] = (target) => filter(target, name2);
      this.ctx.events.emit(self, "internal/service", name2, this._getImpl(name2, false)?.value);
    }
    return fibers;
  }
  /**
  * Define a computed context property backed by get/set hooks.
  *
  * @param name — the context property name.
  * @param options — the `get` hook and optional `set` hook.
  * @returns a disposer that removes the accessor.
  */
  accessor(name2, options) {
    return this.ctx.fiber.effect(() => {
      if (name2 in this.props) throw new Error(`property "${name2}" is already declared as ${this.props[name2].type}`);
      this.props[name2] = {
        type: "accessor",
        ...options
      };
      return () => delete this.props[name2];
    }, `ctx.accessor(${JSON.stringify(name2)})`);
  }
  /**
  * Expose selected members of a service directly on `ctx`.
  *
  * See the `ctx.mixin()` overload above for the full contract.
  *
  * @param source — a context property name or a source object.
  * @param mixins — keys to forward, or a source-key → ctx-key map.
  * @returns a disposer that removes all created accessors.
  */
  mixin(source, mixins) {
    const self = this;
    return this.ctx.fiber.effect(function* () {
      const entries = Array.isArray(mixins) ? mixins.map((key) => [key, key]) : Object.entries(mixins);
      const getTarget = (ctx, error) => {
        return ctx[source];
      };
      for (const [key, value] of entries) yield self.accessor(value, {
        get(receiver, error) {
          const service = getTarget(this, error);
          if (isNullable(service)) return service;
          const mixin = receiver ? withProps(receiver, service) : service;
          const value2 = Reflect.get(service, key, mixin);
          if (typeof value2 !== "function") return value2;
          return value2.bind(mixin ?? service);
        },
        set(value2, receiver, error) {
          const service = getTarget(this, error);
          const mixin = receiver ? withProps(receiver, service) : service;
          return Reflect.set(service, key, value2, mixin);
        }
      });
    }, `ctx.mixin(${JSON.stringify(source)})`);
  }
  /**
  * Attach this context's tracing wrapper to a value.
  *
  * @param value — the value to wrap.
  * @returns the traceable wrapper (or the value itself when not applicable).
  */
  trace(value) {
    return getTraceable(this.ctx, value);
  }
  /**
  * Wrap a callback so calls trace `this` and arguments to this context.
  *
  * @param callback — the function to wrap.
  * @returns a proxy delegating to `callback` with traced values.
  */
  bind(callback) {
    return new Proxy(callback, {
      apply: (target, thisArg, args) => {
        return Reflect.apply(target, this.trace(thisArg), args.map((arg) => this.trace(arg)));
      },
      construct: (target, args, newTarget) => {
        return Reflect.construct(target, args.map((arg) => this.trace(arg)), newTarget);
      }
    });
  }
};
var kValidationError2 = Symbol.for("ValidationError");
var ValidationError2 = class extends TypeError {
  name = "ValidationError";
  /**
  * Build the aggregated message from schema issues.
  *
  * @param issues — the standard-schema issues, one message line each.
  */
  constructor(issues) {
    super(`invalid config:
` + issues.map((issue) => {
      if (issue.path) return `  - ${issue.message} (at ${issue.path.join(".")})`;
      else return `  - ${issue.message}`;
    }).join("\n"));
  }
};
Object.defineProperty(ValidationError2.prototype, kValidationError2, { value: true });
function resolveConfig(runtime, config) {
  if (!runtime.Config) return config;
  const result = runtime.Config["~standard"].validate(config);
  if ("then" in result) throw new TypeError("Async config validation is not supported");
  if (result.issues) throw new ValidationError2(result.issues);
  else return result.value;
}
var effectInertia = /* @__PURE__ */ new WeakMap();
function runDisposable(dispose) {
  const result = dispose();
  return effectInertia.get(dispose)?.() ?? result;
}
function emitPluginDisposed(context, fiber) {
  const args = ["internal/plugin", fiber];
  let callbacks;
  try {
    callbacks = context.events.dispatch("emit", args);
  } catch (error) {
    context.logger.error(error);
    return;
  }
  for (const callback of callbacks) try {
    const returned = callback(...args);
    Promise.resolve(returned).catch((error) => context.logger.error(error));
  } catch (error) {
    context.logger.error(error);
  }
}
var CordisError = class CordisError2 extends Error {
  code;
  /**
  * @param code — the stable error code; also the default message.
  * @param message — optional human-readable override.
  */
  constructor(code, message) {
    super(message ?? CordisError2.Code[code]);
    this.code = code;
  }
};
(function(CordisError3) {
  CordisError3.Code = { INACTIVE_EFFECT: "cannot create effect on inactive context" };
})(CordisError || (CordisError = {}));
var INACTIVE = "__INACTIVE__";
var Fiber = class {
  parent;
  inject;
  runtime;
  /** Unique id within the registry; 0 for the root fiber, `null` once disposed. */
  uid;
  /** The context this fiber's plugin runs in (extends the parent context). */
  ctx;
  /** The validated plugin config (updated by `update()`). */
  config;
  /** The raw plugin config, re-resolved before each activation. */
  _config;
  /** Current lifecycle state; transitions emit `internal/status`. */
  state = 0;
  /** Dispose this fiber: unload the plugin, then settle once cleanup finished. */
  dispose;
  /** Snapshot of required service implementations while loaded; `undefined` otherwise. */
  store;
  /** The in-flight load/unload transition, if one is currently running. */
  inertia;
  _hooks = /* @__PURE__ */ Object.create(null);
  _disposables = new DisposableList();
  context;
  _error;
  _runner;
  _store = /* @__PURE__ */ Object.create(null);
  /**
  * Create a fiber. Plugin authors normally obtain fibers from `ctx.plugin()`
  * rather than constructing them directly.
  *
  * @param parent — the context the plugin was loaded from.
  * @param config — raw config, validated against the runtime's schema.
  * @param inject — resolved dependency map (service name → intercept config).
  * @param runtime — the shared plugin runtime, or `null` for the root fiber.
  * @param getOuterStack — captures the caller stack for effect diagnostics.
  */
  constructor(parent, config, inject2, runtime, getOuterStack) {
    this.parent = parent;
    this.inject = inject2;
    this.runtime = runtime;
    this._config = config;
    const collect = (dispose) => {
      this._disposables.push(dispose);
    };
    if (runtime) {
      this.uid = parent.registry.counter;
      this.ctx = this.context = parent.extend({ fiber: this });
      const injectEntries = Object.entries(this.inject);
      if (injectEntries.length) {
        this.ctx[Context.intercept] = Object.create(parent[Context.intercept]);
        for (const [name2, config2] of injectEntries) {
          if (isNullable(config2)) continue;
          this.ctx[Context.intercept][name2] = config2;
        }
      }
      this._runner = {
        epoch: INACTIVE,
        getOuterStack,
        execute: function() {
          if (isConstructor(runtime.callback)) {
            const instance = new runtime.callback(this.ctx, this.config);
            for (const hook of instance?.[symbols.initHooks] ?? []) hook();
            return instance?.[symbols.init]?.();
          } else return runtime.callback(this.ctx, this.config);
        },
        collect
      };
      this.dispose = parent.fiber.effect(() => {
        const remove = runtime.fibers.push(this);
        return async () => {
          this.uid = null;
          emitPluginDisposed(this.context, this);
          if (this.ctx.registry.has(runtime.callback)) {
            remove();
            if (!runtime.fibers.length) this.ctx.registry.delete(runtime.callback);
          }
          this._setEpoch(INACTIVE);
          if (!this.inertia) this._updateState(() => {
            this.inertia = this._unload();
            return 5;
          });
          while (this.inertia) await this.inertia;
        };
      }, "ctx.plugin()");
      try {
        this.context.emit("internal/plugin", this);
      } catch (error) {
        Promise.resolve(this.dispose()).catch((reason) => this.ctx.logger.error(reason));
        throw error;
      }
      if (this.uid !== null && parent.fiber.state !== 5) {
        for (const name2 of Object.keys(this.inject)) this._checkImpl(name2);
        this._refresh();
      }
    } else {
      this.uid = 0;
      this.ctx = this.context = parent;
      this.state = 2;
      this.store = /* @__PURE__ */ Object.create(null);
      this._runner = {
        epoch: "",
        getOuterStack,
        execute: () => {
        },
        collect
      };
      this.dispose = () => this.restart();
    }
  }
  /** The plugin's display name, inherited from the nearest named ancestor, else `'root'`. */
  get name() {
    let fiber = this;
    do {
      if (fiber.runtime?.name) return fiber.runtime.name;
      fiber = fiber.parent.fiber;
    } while (fiber !== fiber.parent.fiber);
    return "root";
  }
  /**
  * Throw if the fiber has already been disposed.
  *
  * @returns nothing when the fiber is still active.
  * @throws {CordisError} `INACTIVE_EFFECT` when the fiber's uid has been cleared.
  */
  assertActive() {
    if (this.uid !== null) return;
    throw new CordisError("INACTIVE_EFFECT");
  }
  _execute(runner) {
    const oldEpoch = runner.epoch;
    return composeError((info) => {
      const safeCollect = (dispose) => {
        if (typeof dispose === "function") runner.collect(dispose);
        else if (!isNullable(dispose)) throw new TypeError("Invalid effect");
      };
      const effect = runner.execute.call(this);
      if (typeof effect === "function") return runner.collect(effect);
      else if (isNullable(effect)) {
      } else if (!isObject(effect)) throw new TypeError("Invalid effect");
      else if ("then" in effect) return effect.then(safeCollect);
      else if (Symbol.iterator in effect) {
        info.error = /* @__PURE__ */ new Error();
        const iter = effect[Symbol.iterator]();
        while (true) {
          const result = iter.next();
          safeCollect(result.value);
          if (result.done) return;
        }
      } else if (Symbol.asyncIterator in effect) {
        const iter = effect[Symbol.asyncIterator]();
        return (async () => {
          await Promise.resolve();
          info.error = /* @__PURE__ */ new Error();
          while (true) {
            if (runner.epoch !== oldEpoch) return;
            const result = await iter.next();
            safeCollect(result.value);
            if (result.done) return;
          }
        })();
      } else throw new TypeError("Invalid effect");
    }, runner.getOuterStack);
  }
  effect(execute, label = "anonymous") {
    this.assertActive();
    if (this.state === 5) throw new CordisError("INACTIVE_EFFECT");
    const disposables = [];
    let disposing = false;
    let disposalTask;
    const dispose = () => {
      if (disposing) return disposalTask;
      disposing = true;
      let task2;
      for (const disposable of disposables.splice(0).reverse()) if (task2) task2 = task2.then(() => runDisposable(disposable));
      else {
        const result = runDisposable(disposable);
        if (isObject(result) && "then" in result) task2 = result;
      }
      return disposalTask = task2;
    };
    const meta = {
      label,
      children: []
    };
    const runner = {
      execute,
      epoch: true,
      collect: (dispose2) => {
        disposables.push(dispose2);
        this._disposables.delete(dispose2);
        if (dispose2[symbols.effect]) meta.children.push(dispose2[symbols.effect]);
      },
      getOuterStack: buildOuterStack()
    };
    let task;
    let executing = true;
    let resolveSetup;
    let rejectSetup;
    let setupBarrier;
    let setupFailed = false;
    let inFlight;
    let removeWrapper = () => false;
    const waitForSetup = () => {
      setupBarrier ??= new Promise((resolve4, reject) => {
        resolveSetup = resolve4;
        rejectSetup = reject;
      });
      return setupBarrier;
    };
    const disposeAfter = (setup) => {
      return Promise.resolve(setup).then(() => dispose(), async (reason) => {
        await dispose();
        throw reason;
      });
    };
    const finalizeDisposal = (callback) => {
      let result;
      try {
        result = callback();
      } catch (error) {
        removeWrapper();
        throw error;
      }
      if (isObject(result) && "then" in result) {
        const pending = Promise.resolve(result).finally(() => {
          removeWrapper();
          if (inFlight === pending) inFlight = void 0;
        });
        return inFlight = pending;
      }
      removeWrapper();
      return result;
    };
    const wrapper = defineProperty(() => {
      if (!runner.epoch) return setupFailed ? inFlight : void 0;
      runner.epoch = false;
      return finalizeDisposal(() => {
        if (executing) return disposeAfter(waitForSetup());
        return task ? disposeAfter(task) : dispose();
      });
    }, symbols.effect, meta);
    effectInertia.set(wrapper, () => inFlight);
    removeWrapper = this._disposables.push(wrapper);
    try {
      task = this._execute(runner);
    } catch (reason) {
      executing = false;
      setupFailed = true;
      runner.epoch = false;
      let cleanup;
      try {
        cleanup = finalizeDisposal(dispose);
      } finally {
        rejectSetup?.(reason);
      }
      if (isObject(cleanup) && "then" in cleanup) cleanup.catch((error) => this.ctx.logger.error(error));
      throw reason;
    }
    executing = false;
    if (setupBarrier) Promise.resolve(task).then(resolveSetup, rejectSetup);
    task?.catch(() => {
      if (!runner.epoch) return dispose();
      return finalizeDisposal(dispose);
    }).catch((error) => this.ctx.logger.error(error));
    const disposeAsync = () => {
      if (!runner.epoch) return;
      runner.epoch = false;
      return finalizeDisposal(dispose);
    };
    wrapper.then = async (onFulfilled, onRejected) => {
      return Promise.resolve(task).then(() => disposeAsync).then(onFulfilled, onRejected);
    };
    return wrapper;
  }
  /**
  * Return metadata for currently registered effects.
  *
  * @returns one {@link EffectMeta} tree per labeled live effect.
  */
  getEffects() {
    return [...this._disposables].map((dispose) => dispose[symbols.effect]).filter(Boolean);
  }
  _getState() {
    if (this.uid === null) return 4;
    if (this._error) return 3;
    if (this._runner.epoch !== INACTIVE) return 2;
    return 0;
  }
  _updateState(callback) {
    const oldState = this.state;
    this.state = callback() ?? this._getState();
    if (oldState === this.state) return;
    this.context.emit("internal/status", this, oldState);
    if (oldState !== 2 && this.state !== 2) return;
    for (const key of Reflect.ownKeys(this.ctx.reflect.store)) {
      const impl = this.ctx.reflect.store[key];
      if (impl.fiber !== this) continue;
      this.ctx.reflect.notify([impl.name]);
    }
  }
  _checkImpl(name2) {
    const impl = this.ctx.reflect._getImpl(name2, true);
    if (!impl) return delete this._store[name2];
    try {
      if (impl.check && !impl.check.call(getTraceable(this.ctx, impl.value))) return delete this._store[name2];
    } catch (error) {
      impl.fiber.ctx.logger.error(error);
      return delete this._store[name2];
    }
    this._store[name2] = impl;
  }
  _refresh() {
    let epoch = false;
    epoch = "";
    for (const name2 of Object.keys(this.inject)) {
      const impl = this._store[name2];
      if (!impl) {
        epoch = INACTIVE;
        break;
      }
      epoch += ":" + impl.fiber.uid;
    }
    this._setEpoch(epoch);
  }
  _setEpoch(epoch) {
    const oldEpoch = this._runner.epoch;
    if (epoch === oldEpoch) return;
    this._runner.epoch = epoch;
    if (this.inertia) return;
    this._updateState(() => {
      if (epoch !== INACTIVE && oldEpoch === INACTIVE) {
        this.inertia = this._reload();
        return 1;
      } else {
        this.inertia = this._unload();
        return 5;
      }
    });
  }
  _resolveConfig(config) {
    config = this.context.waterfall(this, "internal/config", config, () => config);
    return this.runtime ? resolveConfig(this.runtime, config) : config;
  }
  async _reload() {
    this.store = { ...this._store };
    const oldEpoch = this._runner.epoch;
    try {
      await Promise.resolve();
      if (this._runner.epoch === oldEpoch) {
        this.config = this._resolveConfig(this._config);
        await this._execute(this._runner);
        this._error = void 0;
      }
    } catch (reason) {
      this.ctx.logger.error(reason);
      this._error = reason;
      this._runner.epoch = INACTIVE;
    }
    this._updateState(() => {
      if (this._runner.epoch === oldEpoch) this.inertia = void 0;
      else {
        this.inertia = this._unload();
        return 5;
      }
    });
  }
  async _unload() {
    await Promise.all(this._disposables.clear().map(async (dispose) => {
      try {
        await composeError(async (info) => {
          await Promise.resolve();
          info.error = /* @__PURE__ */ new Error();
          await runDisposable(dispose);
        }, this._runner.getOuterStack);
      } catch (reason) {
        this.ctx.logger.error(reason);
      }
    }));
    this.store = void 0;
    this._updateState(() => {
      if (this._runner.epoch === INACTIVE) this.inertia = void 0;
      else {
        this.inertia = this._reload();
        return 1;
      }
    });
  }
  /**
  * Wait for current lifecycle work and rethrow startup errors.
  *
  * @returns this fiber, once it has settled into a stable state.
  * @throws the config-validation or plugin-startup error, if any.
  */
  async await() {
    while (this.inertia) await this.inertia;
    if (this._error) throw this._error;
    return this;
  }
  /**
  * Dispose and immediately reload this plugin with its current config.
  *
  * @returns a promise resolving once the reload settled.
  * @throws {CordisError} `INACTIVE_EFFECT` when the fiber is already disposed.
  */
  async restart() {
    this.assertActive();
    this._setEpoch(INACTIVE);
    this._refresh();
    await this.await();
  }
  /**
  * Validate and apply new config, then restart the plugin.
  *
  * Runs the `internal/update` waterfall first, so update hooks (and HMR)
  * can veto or replace the restart.
  *
  * @param config — the new raw config; validated before anything restarts.
  * @param noSave — hint for persistence hooks not to write the change back.
  * @returns the update waterfall result; the default restart returns a promise.
  * @throws when validation, an update listener, or the restarted plugin fails.
  */
  update(config, noSave = false) {
    this.assertActive();
    this._config = config;
    if (this.state !== 2) {
      this._error = void 0;
      this._setEpoch(INACTIVE);
      this._refresh();
      return;
    }
    config = this._resolveConfig(config);
    return this.context.waterfall(this, "internal/update", config, noSave, () => {
      this.config = config;
      this._error = void 0;
      return this.restart();
    });
  }
};
function isApplicable(object2) {
  return object2 && typeof object2 === "object" && typeof object2.apply === "function";
}
function Inject(name2, config) {
  return function(value, decorator) {
    if (decorator.kind === "class") {
      if (!Object.hasOwn(value, "inject")) {
        defineProperty(value, "inject", Object.create(Object.getPrototypeOf(value).inject ?? null));
        defineProperty(value.inject, symbols.checkProto, true);
      }
      value.inject[name2] = config;
    } else if (decorator.kind === "method") {
      const inject2 = (value[symbols.metadata] ??= {}).inject ??= /* @__PURE__ */ Object.create(null);
      inject2[name2] = config;
      decorator.addInitializer(function() {
        const property2 = this[symbols.tracker]?.property;
        (this[symbols.initHooks] ??= []).push(() => {
          this.ctx.inject(inject2, (ctx) => {
            return value.call(property2 ? withProps(this, { [property2]: ctx }) : this);
          });
        });
      });
    } else throw new Error("@Inject() can only be used on class or class methods");
  };
}
(function(Inject2) {
  function resolve4(inject2, result = /* @__PURE__ */ Object.create(null)) {
    if (!inject2) return result;
    if (Array.isArray(inject2)) for (const name2 of inject2) result[name2] = null;
    else if (Reflect.has(inject2, symbols.checkProto)) {
      Object.assign(result, resolve4(Object.getPrototypeOf(inject2)));
      for (const name2 of Object.keys(inject2)) result[name2] = inject2[name2] ?? null;
    } else for (const name2 of Object.keys(inject2)) result[name2] = inject2[name2] ?? null;
    return result;
  }
  Inject2.resolve = resolve4;
})(Inject || (Inject = {}));
var RegistryService = class {
  ctx;
  _counter = 0;
  _internal = /* @__PURE__ */ new Map();
  constructor(ctx) {
    this.ctx = ctx;
    defineProperty(this, symbols.tracker, {
      property: "ctx",
      noShadow: true
    });
  }
  /** Allocate the next fiber uid (increments on every read). */
  get counter() {
    return ++this._counter;
  }
  /** Number of registered plugin runtimes. */
  get size() {
    return this._internal.size;
  }
  /**
  * Resolve a supported plugin shape to its executable callback.
  *
  * @param plugin — a function, class, or `{ apply }` object plugin.
  * @returns the callback identifying the plugin, or `undefined` if invalid.
  */
  resolve(plugin) {
    try {
      if (typeof plugin === "function") return plugin;
      if (isApplicable(plugin)) return plugin.apply;
    } catch {
    }
  }
  /**
  * Look up the runtime record for a plugin.
  *
  * @param plugin — any supported plugin shape.
  * @returns the runtime, or `undefined` when the plugin is not registered.
  */
  get(plugin) {
    const key = this.resolve(plugin);
    return key && this._internal.get(key);
  }
  /**
  * Check whether a plugin has a registered runtime.
  *
  * @param plugin — any supported plugin shape.
  * @returns `true` when at least one fiber of the plugin exists.
  */
  has(plugin) {
    const key = this.resolve(plugin);
    return !!key && this._internal.has(key);
  }
  /**
  * Dispose every running fiber for a plugin and remove its runtime record.
  *
  * @param plugin — any supported plugin shape.
  * @returns the removed runtime, or `undefined` when none was registered.
  */
  delete(plugin) {
    const key = this.resolve(plugin);
    const runtime = key && this._internal.get(key);
    if (!runtime) return;
    this._internal.delete(key);
    for (const fiber of runtime.fibers) fiber.dispose();
    return runtime;
  }
  /** Iterate the registered plugin callbacks. */
  keys() {
    return this._internal.keys();
  }
  /** Iterate the registered plugin runtimes. */
  values() {
    return this._internal.values();
  }
  /** Iterate `[callback, runtime]` pairs. */
  entries() {
    return this._internal.entries();
  }
  /**
  * Visit every registered runtime.
  *
  * @param callback — receives each runtime and its identifying callback.
  */
  forEach(callback) {
    return this._internal.forEach(callback);
  }
  /**
  * Start a callback once the requested dependencies are available.
  *
  * @param inject — required services, as an array or a name → config map.
  * @param callback — plugin body called with `(ctx, config)`.
  * @returns the fiber; awaiting it settles once loading finished.
  */
  inject(inject2, callback) {
    return this.plugin({
      inject: inject2,
      apply: callback,
      name: callback.name
    });
  }
  /**
  * Start a plugin in the current context and return its fiber.
  *
  * Creates (or reuses) the plugin's runtime record, then starts a new fiber
  * under the current context. Throws if `plugin` is not a supported shape or
  * if the current fiber is already disposed.
  *
  * @param plugin — a function, class, or `{ apply }` object plugin.
  * @param config — the plugin config, validated against its `Config` schema.
  * @param getOuterStack — captures the caller stack for effect diagnostics.
  * @returns the fiber; awaiting it settles once loading finished.
  */
  plugin(plugin, config, getOuterStack = buildOuterStack()) {
    const callback = this.resolve(plugin);
    if (!callback) throw new Error('invalid plugin, expect function or object with an "apply" method, received ' + typeof plugin);
    this.ctx.fiber.assertActive();
    let runtime = this._internal.get(callback);
    if (!runtime) {
      let name2 = plugin.name;
      if (name2 === "apply") name2 = void 0;
      runtime = {
        name: name2,
        callback,
        fibers: new DisposableList(),
        Config: plugin.Config
      };
      this._internal.set(callback, runtime);
    }
    const fiber = new Fiber(this.ctx, config, Inject.resolve(plugin.inject), runtime, getOuterStack);
    const wrapped = Object.create(fiber);
    wrapped.then = (onFulfilled, onRejected) => {
      return fiber.await().then(onFulfilled, onRejected);
    };
    return wrapped;
  }
};
var Context = class Context2 {
  /** Symbol key under which a disposer exposes its {@link EffectMeta} diagnostics tree. */
  static effect = symbols.effect;
  /** Symbol key for a context's listener filter, consulted on every event dispatch. */
  static filter = symbols.filter;
  /** Symbol key of the isolation map (see the `Context[symbols.isolate]` property). */
  static isolate = symbols.isolate;
  /** Symbol key of the intercept map (see the `Context[symbols.intercept]` property). */
  static intercept = symbols.intercept;
  /**
  * Returns true for Cordis context proxies and context prototypes.
  *
  * Works across realms and across multiple copies of cordis, because the
  * brand is keyed by a global symbol rather than by `instanceof`.
  *
  * @param value — the value to test.
  * @returns `true` if `value` is a Cordis context, narrowing its type.
  */
  static is(value) {
    return !!value?.[Context2.is];
  }
  static {
    Context2.is[Symbol.toPrimitive] = () => Symbol.for("cordis.is");
    Context2.prototype[Context2.is] = true;
  }
  /** Create the root context and install the built-in services. */
  constructor() {
    this[symbols.isolate] = /* @__PURE__ */ Object.create(null);
    this[symbols.intercept] = /* @__PURE__ */ Object.create(null);
    const self = new Proxy(this, ReflectService.handler);
    this.root = self;
    this.baseUrl = void 0;
    this.fiber = new Fiber(self, {}, /* @__PURE__ */ Object.create(null), null, () => []);
    this.reflect = new ReflectService(self);
    this.registry = new RegistryService(self);
    this.events = new EventsService(self);
    this.logger = new LoggerService(self);
    this.fiber._disposables.clear();
    return self;
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return `Context <${this.fiber.name}>`;
  }
  /**
  * Create a child context with extra metadata on top of the current scope.
  *
  * The child prototypally inherits every property of this context; own
  * properties of `meta` shadow the inherited ones. The parent is not mutated.
  *
  * @param meta — own properties (including symbol keys) to define on the child.
  * @returns a child context inheriting from this one.
  */
  extend(meta = {}) {
    const shadow = Reflect.getOwnPropertyDescriptor(this, symbols.shadow)?.value;
    const self = Object.create(getTraceable(this, this));
    for (const prop of Reflect.ownKeys(meta)) Object.defineProperty(self, prop, Reflect.getOwnPropertyDescriptor(meta, prop));
    if (!shadow) return self;
    return Object.assign(Object.create(self), { [symbols.shadow]: shadow });
  }
  /**
  * Create a child context with an independent service scope for `name`.
  *
  * Below the returned context, reads and writes of the service `name`
  * resolve against the new label instead of the parent's, so a different
  * implementation can be provided without affecting the parent scope.
  * Passing the same `label` to two `isolate()` calls joins their scopes.
  *
  * @param name — the service name to isolate.
  * @param label — scope label to join; defaults to a fresh unique symbol.
  * @returns a child context whose `name` service resolves in the new scope.
  */
  isolate(name2, label) {
    const shadow = Object.create(this[symbols.isolate]);
    shadow[name2] = label ?? Symbol(name2);
    return this.extend({ [symbols.isolate]: shadow });
  }
  intercept(name2, config) {
    const intercept = Object.create(this[symbols.intercept]);
    intercept[name2] = config;
    return this.extend({ [symbols.intercept]: intercept });
  }
};
var Service = class Service2 {
  ctx;
  /** Symbol key of an instance method run after construction (class plugins). */
  static init = symbols.init;
  /** Symbol key of the availability predicate passed to `ctx.provide()`. */
  static check = symbols.check;
  /** Symbol key of the phantom intercept-config type parameter. */
  static config = symbols.config;
  /** Symbol key of the call body making a service callable (e.g. `ctx.logger()`). */
  static invoke = symbols.invoke;
  /** Symbol key of the helper deriving an extended service instance. */
  static extend = symbols.extend;
  /** Symbol key of the tracker metadata used for context tracing. */
  static tracker = symbols.tracker;
  /** Symbol key of the intercept-config resolution helper below. */
  static resolveConfig = symbols.resolveConfig;
  /** The service name this instance is registered under. */
  name;
  /**
  * Register this instance as `name` in the current context.
  *
  * Calls `ctx.reflect.provide(name, this, this[Service.check])`, so the
  * service is unregistered automatically when the owning fiber unloads.
  * Services with a `[Service.invoke]` body return a callable instance.
  *
  * @param ctx — the context to register in (stored as `this.ctx`).
  * @param name — the service name; defaults to the static `provide` field.
  */
  constructor(ctx, name2) {
    this.ctx = ctx;
    name2 ??= this.constructor["provide"];
    let self = this;
    const tracker = {
      associate: name2,
      property: "ctx"
    };
    if (self[symbols.invoke]) self = createCallable(name2, joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
    self.ctx = ctx;
    self.name = name2;
    defineProperty(self, symbols.tracker, tracker);
    self.ctx.reflect.provide(name2, self, this[symbols.check]);
    return self;
  }
  [symbols.filter](ctx) {
    return ctx[symbols.isolate][this.name] === this.ctx[symbols.isolate][this.name];
  }
  [symbols.extend](props) {
    let self;
    if (this[Service2.invoke]) self = createCallable(this.name, this, this[symbols.tracker]);
    else self = Object.create(this);
    return Object.assign(self, props);
  }
  /**
  * Merge intercept config from ancestors with optional base and head values.
  *
  * Entries added closer to the root apply first; `base` is prepended and
  * `head` appended. Uses `Config.merge` when the service declares one,
  * otherwise a shallow `Object.assign`.
  *
  * @param base — lowest-precedence config merged before all intercepts.
  * @param head — highest-precedence config merged after all intercepts.
  * @returns the merged config.
  */
  [symbols.resolveConfig](base, head) {
    let intercept = this.ctx[Context.intercept];
    const configs = [];
    while (this.name in intercept) {
      if (Object.hasOwn(intercept, this.name)) configs.unshift(intercept[this.name]);
      intercept = Object.getPrototypeOf(intercept);
    }
    if (base) configs.unshift(base);
    if (head) configs.push(head);
    if (this["Config"]?.merge) return this["Config"].merge(...configs);
    else return Object.assign({}, ...configs);
  }
  static [Symbol.hasInstance](instance) {
    if (!instance) return false;
    let constructor = instance.constructor;
    while (constructor) {
      constructor = constructor.prototype?.constructor;
      if (constructor === this) return true;
      constructor &&= Object.getPrototypeOf(constructor);
    }
    return false;
  }
};

// node_modules/@deepseek-ai/dsh-settings/lib/index.js
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function walk(node, value, path, secrets) {
  if (node === void 0) return value;
  if (node.meta?.role === "secret") {
    secrets.push({
      path,
      set: value !== void 0
    });
    return;
  }
  switch (node.type) {
    case "object": {
      const properties = node.dict ?? {};
      const source = isRecord(value) ? value : void 0;
      const rebuilt = {};
      if (source !== void 0) for (const [key, entry] of Object.entries(source)) {
        if (key in properties) continue;
        rebuilt[key] = entry;
      }
      for (const [key, child] of Object.entries(properties)) {
        const stripped = walk(child, source?.[key], [...path, key], secrets);
        if (stripped !== void 0) rebuilt[key] = stripped;
      }
      return source === void 0 && Object.keys(rebuilt).length === 0 ? value : rebuilt;
    }
    case "dict": {
      if (!isRecord(value)) return value;
      const rebuilt = {};
      for (const [key, entry] of Object.entries(value)) {
        const stripped = walk(node.inner, entry, [...path, key], secrets);
        if (stripped !== void 0) rebuilt[key] = stripped;
      }
      return rebuilt;
    }
    case "array":
      if (!Array.isArray(value)) return value;
      return value.map((entry, index) => walk(node.inner, entry, [...path, String(index)], secrets));
    default:
      return value;
  }
}
function redactSecrets(schema, value) {
  const secrets = [];
  return {
    value: walk(schema, value, [], secrets),
    secrets
  };
}
var NAMESPACE_PATTERN = /^[a-z][a-z0-9-]*$/;
function settingsNamespace(value) {
  if (!NAMESPACE_PATTERN.test(value)) throw new TypeError(`settings namespace "${value}" must match ${String(NAMESPACE_PATTERN)}`);
  return value;
}
function deepEqualJson(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((entry, index) => deepEqualJson(entry, b[index]));
  }
  const left = a;
  const right = b;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => key in right && deepEqualJson(left[key], right[key]));
}
var SettingsConflictError = class extends Error {
  /** Stable machine code for wire layers mapping this to their own taxonomy. */
  code = "SETTINGS_CONFLICT";
  /** The revision the write expected. */
  expected;
  /** The revision the namespace actually stands at. */
  actual;
  /**
  * @param ns - the namespace whose write was refused.
  * @param expected - the revision the caller sent.
  * @param actual - the revision now stored.
  */
  constructor(ns, expected, actual) {
    super(`settings namespace "${ns}" changed since it was read (expected revision ${String(expected)}, now ${String(actual)})`);
    this.name = "SettingsConflictError";
    this.expected = expected;
    this.actual = actual;
  }
};
function isPlainObject2(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
function applyPathOp(section, op) {
  const [head, ...rest] = op.path;
  if (head === void 0) {
    if (op.op === "unset") return {};
    if (!isPlainObject2(op.value)) throw new TypeError("settings mutate: setting the section root requires a plain object");
    return { ...op.value };
  }
  if (rest.length === 0) {
    if (op.op === "set") return {
      ...section,
      [head]: op.value
    };
    const { [head]: _removed, ...kept } = section;
    return kept;
  }
  const child = section[head];
  if (!isPlainObject2(child)) {
    if (op.op === "unset") return section;
    return {
      ...section,
      [head]: applyPathOp({}, {
        ...op,
        path: rest
      })
    };
  }
  return {
    ...section,
    [head]: applyPathOp(child, {
      ...op,
      path: rest
    })
  };
}
function describeRejected(value) {
  if (value === void 0) return "undefined";
  if (typeof value === "object" && value !== null) {
    const name2 = Object.getPrototypeOf(value)?.constructor?.name;
    return name2 === void 0 || name2 === "Object" ? "a non-plain object" : `a ${name2}`;
  }
  return `a ${typeof value}`;
}
function cloneJsonShaped(root, reject) {
  const visiting = /* @__PURE__ */ new WeakSet();
  const clone2 = (value, path) => {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw reject("a non-finite number", path);
      return value;
    }
    if (Array.isArray(value)) {
      if (visiting.has(value)) throw reject("a circular reference", path);
      visiting.add(value);
      const entries = value.map((entry, index) => clone2(entry, `${path}[${index}]`));
      visiting.delete(value);
      return entries;
    }
    if (isPlainObject2(value)) {
      if (visiting.has(value)) throw reject("a circular reference", path);
      visiting.add(value);
      const out = {};
      for (const [key, entry] of Object.entries(value)) {
        if (entry === void 0) continue;
        out[key] = clone2(entry, `${path}.${key}`);
      }
      visiting.delete(value);
      return out;
    }
    throw reject(describeRejected(value), path);
  };
  return clone2(root, "$");
}
function mergeLayers(under, over) {
  if (over === void 0) return under;
  if (!isPlainObject2(under) || !isPlainObject2(over)) return over;
  const merged = { ...under };
  for (const [key, value] of Object.entries(over)) merged[key] = key in merged ? mergeLayers(merged[key], value) : value;
  return merged;
}
function deepFreeze(value) {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const entry of Object.values(value)) deepFreeze(entry);
  return Object.freeze(value);
}
var SettingsProvider = class extends Service {
  registrations = /* @__PURE__ */ new Map();
  /** Latest published raw document; empty until the provider's first publish. */
  document = {};
  /** Per-namespace write chains; settled tails, so a failure never poisons the queue. */
  writeQueues = /* @__PURE__ */ new Map();
  /** In-flight watcher invocation segments, drained by the dispose teardown. */
  pendingTails = /* @__PURE__ */ new Set();
  /** Set at service dispose: refuse new writes while queued ones drain. */
  stopped = false;
  /** Opaque read of {@link stopped}: control flow cannot narrow it across awaits. */
  isStopped() {
    return this.stopped;
  }
  constructor(ctx) {
    super(ctx, "settings");
  }
  /**
  * Load the provider's document once and publish it before the service
  * becomes injectable, and register the write-drain teardown. Providers with
  * their own init (watchers, connections) delegate here first via
  * `yield* super[Service.init]()`; their disposers then run before the drain.
  */
  async *[Service.init]() {
    yield async () => {
      this.stopped = true;
      await Promise.allSettled([...this.writeQueues.values(), ...this.pendingTails]);
    };
    this.publish(await this.load());
  }
  /**
  * Absolute path of the provider's user-editable document, when its storage
  * is one local file. Configuration surfaces use this only as availability
  * metadata; the guarded open operation resolves the path again Host-side.
  * Non-file providers leave it undefined and expose no open-document affordance.
  * @returns the absolute local document path, or undefined for non-file storage.
  */
  get documentPath() {
  }
  /**
  * Prepare the provider's user-editable document for a native editor. File
  * providers may materialize an absent document before returning its path;
  * non-file providers return undefined.
  * @returns the absolute local document path, or undefined for non-file storage.
  */
  prepareDocument() {
    return Promise.resolve(this.documentPath);
  }
  /**
  * Register a namespace schema and receive its owner scope. The registration
  * is an effect on the calling plugin's fiber: disposing that fiber removes
  * the namespace and its observers. An invalid stored section fails the
  * registration itself — the earliest point where the schema can judge it.
  * @param ns - unique namespace; duplicate registration fails loud.
  * @param schema - schemastery schema resolving this namespace's value.
  * @param options - composition `base` layer and effect timing.
  * @returns the owner scope for reads, observation, and updates.
  */
  register(ns, schema, options) {
    if (this.registrations.has(ns)) throw new Error(`settings namespace "${ns}" is already registered`);
    const registration = {
      ns,
      schema,
      base: options?.base,
      applies: options?.applies ?? "live",
      ...options?.validate === void 0 ? {} : { validate: options.validate },
      resolved: deepFreeze(this.resolve(schema, options?.base, this.section(ns), options?.validate)),
      revision: 0,
      watchers: /* @__PURE__ */ new Set()
    };
    this.ctx.effect(() => {
      this.registrations.set(ns, registration);
      return () => this.registrations.delete(ns);
    }, `settings.register(${JSON.stringify(String(ns))})`);
    return {
      get: () => registration.resolved,
      watch: (callback) => {
        const watcher = {
          callback,
          tail: Promise.resolve(),
          active: true
        };
        registration.watchers.add(watcher);
        return () => {
          watcher.active = false;
          registration.watchers.delete(watcher);
        };
      },
      update: (patch) => this.update(ns, patch),
      replace: (section) => this.replace(ns, section)
    };
  }
  /**
  * Describe every registered namespace for configuration surfaces, including
  * the composition `base` and raw user layers so a form can mark which fields
  * the user overrode (presence in `user`) and what a reset returns to.
  * @param options - redaction switch; wire surfaces must redact.
  * @returns one descriptor per registered namespace, in registration order.
  */
  describe(options) {
    return [...this.registrations.values()].map((registration) => {
      let user;
      try {
        user = this.section(registration.ns);
      } catch {
        user = void 0;
      }
      const base = registration.base === void 0 ? void 0 : structuredClone(registration.base);
      const detachedUser = user === void 0 ? void 0 : structuredClone(user);
      const descriptor = {
        ns: registration.ns,
        schema: registration.schema.toJSON(),
        value: registration.resolved,
        revision: registration.revision,
        ...base === void 0 ? {} : { base },
        ...detachedUser === void 0 ? {} : { user: detachedUser },
        applies: registration.applies
      };
      if (options?.redactSecrets !== true) return descriptor;
      const schema = registration.schema;
      const redacted = redactSecrets(schema, registration.resolved);
      return {
        ...descriptor,
        value: redacted.value,
        ...base === void 0 ? {} : { base: redactSecrets(schema, base).value },
        ...detachedUser === void 0 ? {} : { user: redactSecrets(schema, detachedUser).value },
        secrets: redacted.secrets
      };
    });
  }
  /**
  * Read one registered namespace's resolved value.
  * @param ns - the namespace to read.
  * @returns the resolved value, or `undefined` while unregistered.
  */
  get(ns) {
    return this.registrations.get(ns)?.resolved;
  }
  /**
  * Merge a patch into one registered namespace's user layer, validate the
  * resolved candidate, persist through the provider, then commit and emit.
  * A validation failure rejects before anything is persisted. Writes to one
  * namespace are serialized: concurrent updates apply in call order, each
  * merging over the previous write's committed section.
  * @param ns - the registered namespace to update.
  * @param patch - plain-object patch over the user section.
  * @param expectedRevision - the descriptor `revision` the caller read; a
  *   namespace that moved past it rejects with {@link SettingsConflictError}.
  */
  async update(ns, patch, expectedRevision) {
    return this.write(ns, patch, "merge", expectedRevision);
  }
  /**
  * Replace one registered namespace's user section wholesale, validate,
  * persist, then commit and emit. Keys absent from `section` fall back to the
  * composition `base` and schema defaults — this is the removal/reset path a
  * merge-only patch cannot express (`replace({})` re-inherits everything).
  * @param ns - the registered namespace to replace.
  * @param section - the complete next user section.
  * @param expectedRevision - the descriptor `revision` the caller read; a
  *   namespace that moved past it rejects with {@link SettingsConflictError}.
  */
  async replace(ns, section, expectedRevision) {
    return this.write(ns, section, "replace", expectedRevision);
  }
  /**
  * Apply path-addressed edits to one registered namespace's user section,
  * validate, persist, then commit and emit. The ops are applied to the
  * section as it stands when the write reaches the front of the queue, so a
  * caller never has to restate fields it did not touch — and, crucially,
  * cannot delete fields it never saw. This is the write path for any caller
  * holding a redacted view; `replace` remains the wholesale reset.
  * @param ns - the registered namespace to edit.
  * @param ops - ordered path edits; later ops observe earlier ones.
  * @param expectedRevision - the descriptor `revision` the caller read; a
  *   namespace that moved past it rejects with {@link SettingsConflictError}.
  */
  async mutate(ns, ops, expectedRevision) {
    if (!Array.isArray(ops)) throw new TypeError(`settings mutate for "${ns}" must be an array of path ops`);
    for (const op of ops) {
      if (!isPlainObject2(op) || op["op"] !== "set" && op["op"] !== "unset") throw new TypeError(`settings mutate for "${ns}" ops must be {op:'set'|'unset', path}`);
      if (!Array.isArray(op["path"]) || op["path"].some((part) => typeof part !== "string")) throw new TypeError(`settings mutate for "${ns}" op paths must be arrays of strings`);
    }
    return this.write(ns, ops, "mutate", expectedRevision);
  }
  /** Validate a write, then queue it on the namespace's serialized write chain. */
  write(ns, input, mode, expectedRevision) {
    const verb = mode === "merge" ? "update" : mode === "replace" ? "replace" : "mutate";
    const registration = this.registrations.get(ns);
    if (registration === void 0) throw new Error(`settings namespace "${ns}" is not registered`);
    if (this.isStopped()) throw new Error(`settings service is disposed: "${ns}" cannot be written`);
    if (!this.writable) throw new Error(`settings provider is read-only: "${ns}" cannot be updated in-process`);
    let payload;
    if (mode === "mutate") payload = { ops: input };
    else {
      if (!isPlainObject2(input)) throw new TypeError(`settings ${verb} for "${ns}" must be a plain object`);
      payload = input;
    }
    const snapshot = cloneJsonShaped(payload, (label, path) => /* @__PURE__ */ new TypeError(`settings ${verb} for "${ns}" must contain only JSON-compatible data (found ${label} at ${path})`));
    const run = (this.writeQueues.get(ns) ?? Promise.resolve()).catch(() => void 0).then(async () => {
      if (this.isStopped()) throw new Error(`settings service was disposed before the queued "${ns}" ${verb} ran`);
      if (this.registrations.get(ns) !== registration) throw new Error(`settings namespace "${ns}" registration was disposed before the queued ${verb} ran`);
      const current = this.section(ns) ?? {};
      if (expectedRevision !== void 0 && expectedRevision !== registration.revision) throw new SettingsConflictError(ns, expectedRevision, registration.revision);
      const section = mode === "merge" ? mergeLayers(current, snapshot) : mode === "replace" ? snapshot : snapshot["ops"].reduce(applyPathOp, current);
      const next = deepFreeze(this.resolve(registration.schema, registration.base, section, registration.validate));
      await this.persist(ns, section);
      this.document[ns] = section;
      if (this.registrations.get(ns) === registration && !this.isStopped()) {
        this.bumpRevision(registration, current, section);
        this.commit(registration, next, "update");
      }
    });
    this.writeQueues.set(ns, run);
    return run;
  }
  /**
  * Provider hook: commit a complete raw document observed in storage. Each
  * registered namespace re-resolves; an invalid section keeps that
  * namespace's last good value and warns, other namespaces still commit.
  * @param doc - the detached raw document (unregistered sections preserved).
  * @param source - change origin; defaults to `provider`.
  */
  publish(doc, source = "provider") {
    const before = /* @__PURE__ */ new Map();
    for (const registration of this.registrations.values()) try {
      before.set(registration.ns, this.section(registration.ns));
    } catch {
      before.set(registration.ns, void 0);
    }
    this.document = doc;
    for (const registration of this.registrations.values()) {
      let next;
      try {
        next = deepFreeze(this.resolve(registration.schema, registration.base, this.section(registration.ns), registration.validate));
      } catch (error) {
        this.ctx.logger.warn('settings: keeping last good "%s" after invalid stored section', registration.ns);
        this.ctx.logger.warn(error);
        continue;
      }
      this.bumpRevision(registration, before.get(registration.ns), this.section(registration.ns));
      this.commit(registration, next, source);
    }
  }
  /** Read one namespace's raw user section, rejecting non-object sections. */
  section(ns) {
    const section = this.document[ns];
    if (section === void 0) return void 0;
    if (!isPlainObject2(section)) throw new TypeError(`settings section "${ns}" must be an object of keys`);
    return section;
  }
  /** Resolve one namespace value: schema defaults, then `base`, then the user layer. */
  resolve(schema, base, section, validate) {
    const value = schema(mergeLayers(base, section));
    validate?.(value);
    return value;
  }
  /**
  * Advance a namespace's revision when its RAW section changed, and announce
  * it. Deliberately independent of {@link commit}'s resolved-value equality:
  * storing an override equal to the composition base leaves the resolved
  * value alone but changes what the document says, which is exactly what a
  * configuration surface must re-read.
  */
  bumpRevision(registration, before, after) {
    if (deepEqualJson(before, after)) return;
    registration.revision += 1;
    this.emitDocumentUpdated(registration.ns, registration.revision);
  }
  /** Contained fan-out of `settings/document-updated`, mirroring {@link commit}'s. */
  emitDocumentUpdated(ns, revision) {
    let invariantFailure;
    const args = [
      "settings/document-updated",
      ns,
      revision
    ];
    for (const listener of this.ctx.events.dispatch("emit", args)) try {
      const returned = listener(ns, revision);
      if (returned != null && typeof returned.then === "function") Promise.resolve(returned).then(void 0, (error) => {
        this.warnListenerFailure(ns, error);
      });
    } catch (error) {
      if (error?.code === "INVARIANT") {
        invariantFailure ??= error;
        continue;
      }
      this.warnListenerFailure(ns, error);
    }
    if (invariantFailure !== void 0) throw invariantFailure;
  }
  /** Commit a resolved value when changed: swap, notify watchers, emit the event. */
  commit(registration, next, source) {
    const prev = registration.resolved;
    if (deepEqualJson(next, prev)) return;
    registration.resolved = next;
    for (const watcher of [...registration.watchers]) {
      const segment = watcher.tail.then(() => {
        if (!watcher.active || this.isStopped()) return;
        return watcher.callback(next, prev);
      }).then(() => void 0, (error) => {
        this.warnWatcherFailure(registration.ns, error);
      });
      watcher.tail = segment;
      this.pendingTails.add(segment);
      segment.then(() => this.pendingTails.delete(segment));
    }
    let invariantFailure;
    const args = [
      "settings/updated",
      registration.ns,
      next,
      prev,
      source
    ];
    for (const listener of this.ctx.events.dispatch("emit", args)) try {
      const returned = listener(registration.ns, next, prev, source);
      if (returned != null && typeof returned.then === "function") Promise.resolve(returned).then(void 0, (error) => {
        this.warnListenerFailure(registration.ns, error);
      });
    } catch (error) {
      if (error?.code === "INVARIANT") {
        invariantFailure ??= error;
        continue;
      }
      this.warnListenerFailure(registration.ns, error);
    }
    if (invariantFailure !== void 0) throw invariantFailure;
  }
  /** Contained-watcher diagnostic shared by the sync and async failure paths. */
  warnWatcherFailure(ns, error) {
    this.ctx.logger.warn('settings: watcher for "%s" failed', ns);
    this.ctx.logger.warn(error);
  }
  /** Contained-listener diagnostic shared by the sync and async failure paths. */
  warnListenerFailure(ns, error) {
    this.ctx.logger.warn('settings: a settings/updated listener for "%s" failed', ns);
    this.ctx.logger.warn(error);
  }
};
var FIBER_DISPOSED = 4;
var FIBER_UNLOADING = 5;
function isUnloading(ctx) {
  const state = ctx.fiber.state;
  return state === FIBER_UNLOADING || state === FIBER_DISPOSED;
}
function installSettingsSection(ctx, ns, schema, entry, hooks) {
  ctx.inject(["settings"], (sctx) => {
    const scope = sctx.settings.register(ns, schema, {
      base: entry,
      ...hooks.validate === void 0 ? {} : { validate: hooks.validate }
    });
    hooks.setSource(() => scope.get());
    sctx.effect(() => () => {
      if (isUnloading(ctx)) return;
      hooks.setSource(() => entry);
      hooks.onChange();
    });
    hooks.onChange();
    scope.watch(() => {
      if (isUnloading(ctx)) return;
      hooks.onChange();
    });
  });
}

// plugins/dsh-llm-codex/src/adapter.ts
import { spawn as spawn2 } from "node:child_process";
import { constants, existsSync, readFileSync, unlinkSync } from "node:fs";
import { access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, isAbsolute, join as join2, resolve as resolve3 } from "node:path";
import { randomUUID } from "node:crypto";
import { createInterface as createInterface2 } from "node:readline";

// node_modules/@deepseek-ai/dsh-home-paths/lib/index.js
import { homedir } from "node:os";
import { basename, dirname, join, resolve as resolve2 } from "node:path";
var DSH_HOME_DIR_NAME = ".dsh";
var DEFAULT_DSH_HOME_DISPLAY = `~/${DSH_HOME_DIR_NAME}`;
function expandHomePath(path) {
  if (path === "~") return homedir();
  if (path.startsWith("~/") || path.startsWith("~\\")) return join(homedir(), path.slice(2));
  return path;
}

// node_modules/@deepseek-ai/dsh-llm/lib/index.js
import { createRequire } from "node:module";

// node_modules/@deepseek-ai/dsh-timeout/lib/index.js
var MAX_TIMER_DELAY_MS = 2147483647;

// node_modules/@deepseek-ai/dsh-llm/lib/index.js
var HarnessError = class extends Error {
  /** Stable machine-routable failure class (e.g. `RATE_LIMIT`); route on this, never by parsing `message`. */
  code;
  constructor(message, code, options) {
    super(message, options);
    this.code = code;
    this.name = new.target.name;
  }
};
var EMPTY_RESPONSE_CODE = "EMPTY_RESPONSE";
var STRUCTURED_CONTEXT_OVERFLOW = new RegExp(String.raw`(?:^|[^a-z0-9])context[\s_-](?:length|window)[\s_-]` + String.raw`(?:exceed(?:ed|s)?|overflow(?:ed)?|limit[\s_-]exceeded)(?:$|[^a-z0-9])`, "i");
var TOO_LARGE_FOR_CONTEXT = new RegExp(String.raw`\b(?:request|prompt|input|messages?)\s+(?:is\s+|are\s+)?` + String.raw`too\s+(?:large|long)\s+for\s+(?:(?:this|the)\s+)?` + String.raw`(?:model(?:'s)?\s+)?context(?:\s+window)?\b`, "i");
var EXCEEDS_MODEL_CONTEXT = new RegExp(String.raw`\b(?:input|prompt|request|messages?)\b.{0,40}` + String.raw`\b(?:exceed(?:s|ed)?|overflows?|is\s+larger\s+than)\b.{0,40}` + String.raw`\b(?:the\s+)?(?:model(?:'s)?\s+)?context(?:\s+(?:length|window))?\b`, "i");
var DEFAULT_MAX_RETRIES = 5;
var DEFAULT_INITIAL_DELAY_MS = 500;
var DEFAULT_MAX_DELAY_MS = 1e4;
var DEFAULT_JITTER_RATIO = 0.1;
var DEFAULT_RETRYABLE_CODES = Object.freeze([
  EMPTY_RESPONSE_CODE,
  "RATE_LIMIT",
  "SERVER",
  "TIMEOUT",
  "TRANSPORT"
]);
var backoffSchema = Schema.object({
  initialDelayMs: Schema.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_INITIAL_DELAY_MS),
  maxDelayMs: Schema.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_MAX_DELAY_MS),
  jitterRatio: Schema.number().min(0).max(1).default(DEFAULT_JITTER_RATIO)
});
var normalPolicySchema = Schema.object({
  mode: Schema.const("normal").required(),
  maxRetries: Schema.number().step(1).min(0).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_RETRIES),
  retryableCodes: Schema.array(Schema.string()).default([...DEFAULT_RETRYABLE_CODES]),
  backoff: backoffSchema
});
var alwaysPolicySchema = Schema.object({
  mode: Schema.const("always").required(),
  backoff: backoffSchema
});
var RetryPolicySchema = Schema.union([normalPolicySchema, alwaysPolicySchema]);
var { version } = createRequire(import.meta.url)("../package.json");
var LlmError = class extends HarnessError {
  /** Serializable facts retained beside this live Error. */
  failure;
  /**
  * @param message - non-empty human-readable failure summary.
  * @param code - non-empty stable provider-neutral machine code.
  * @param options - optional cause and validated serializable provider facts.
  */
  constructor(message, code, options) {
    if (typeof message !== "string" || message.length === 0) throw new Error("LlmError message must be a non-empty string");
    if (typeof code !== "string" || code.length === 0) throw new Error("LlmError code must be a non-empty string");
    if (options?.status !== void 0 && (!Number.isInteger(options.status) || options.status < 100 || options.status > 599)) throw new Error("LlmError status must be an integer from 100 through 599");
    if (options?.providerRetryAfterMs !== void 0 && (!Number.isFinite(options.providerRetryAfterMs) || options.providerRetryAfterMs <= 0)) throw new Error("LlmError providerRetryAfterMs must be a positive finite number");
    if (options?.requestId !== void 0 && (typeof options.requestId !== "string" || options.requestId.length === 0)) throw new Error("LlmError requestId must be a non-empty string");
    super(message, code, options);
    this.name = "LlmError";
    this.failure = Object.freeze({
      message,
      code,
      ...options?.status === void 0 ? {} : { status: options.status },
      ...options?.providerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs: options.providerRetryAfterMs },
      ...options?.requestId === void 0 ? {} : { requestId: options.requestId }
    });
  }
};
var LlmAdapter = class {
  /**
  * Describe one provider route owned by this adapter.
  * @param provider - a route passed to `registerAdapter()` for this instance.
  * @returns detached display metadata whose id must equal `provider`.
  */
  providerInfo(provider) {
    return {
      id: provider,
      name: provider
    };
  }
  /**
  * Return the provider-owned retry policy captured with this route.
  * @param _provider - a route passed to `registerAdapter()` for this instance.
  * @returns a resolved policy, or `undefined` to use the normal defaults.
  */
  providerRetryPolicy(_provider) {
  }
  /**
  * List models this adapter can currently advertise for one owned provider.
  * The result is advisory: an adapter may accept unlisted model ids, and
  * consumers must not turn absence into request rejection.
  * @param _provider - one provider route owned by this adapter.
  * @returns discoverable models in adapter-preferred order.
  */
  listModels(_provider) {
    return Promise.resolve([]);
  }
  /**
  * Resolve all metadata available for one exact model. This query is
  * independent of the advisory catalog and does not validate request routing.
  * @param provider - one provider route owned by this adapter.
  * @param model - exact model id passed to {@link GenerateOptions.model}.
  * @param _signal - cancellation for this exact-model lookup; asynchronous
  *   implementations must settle promptly after it aborts.
  * @returns provider/model identity plus any context, call-default, and reasoning metadata.
  */
  resolveModel(provider, model, _signal) {
    return Promise.resolve({
      provider,
      id: model,
      name: model
    });
  }
  /**
  * Bind exact model metadata and the eventual request dispatch to one adapter generation.
  * Dynamic adapters override this so settings changes between preparation and
  * dispatch cannot combine one generation's capabilities with another's endpoint.
  * @param provider - registered provider route.
  * @param model - exact model id.
  * @param signal - cancellation for model resolution.
  * @returns model metadata and a one-generation stream entry point.
  */
  async prepareCall(provider, model, signal) {
    return {
      model: await this.resolveModel(provider, model, signal),
      stream: (options) => this.stream(options)
    };
  }
};

// plugins/dsh-llm-codex/src/serialize.ts
function serializeBlocks(blocks, toolNames = /* @__PURE__ */ new Map()) {
  return blocks.map((block) => {
    switch (block.type) {
      case "text":
      case "reasoning":
        return block.text;
      case "image":
        return `[\u56FE\u7247: ${String(block.attachment.attachmentId)}]`;
      case "tool-call":
        return `[\u5DE5\u5177\u8C03\u7528: ${block.name}; toolCallId=${String(block.id)}; arguments=${block.arguments}]`;
      case "tool-result": {
        const result = serializeBlocks(block.content, toolNames);
        const status = block.isError ? "\u9519\u8BEF; " : "";
        const name2 = toolNames.get(String(block.toolCallId));
        const label = name2 === void 0 ? "" : `\u5DE5\u5177=${name2}; `;
        return `[\u5DE5\u5177\u7ED3\u679C: ${status}${label}toolCallId=${String(block.toolCallId)}]
${result}`;
      }
      default:
        return "";
    }
  }).filter((part) => part.length > 0).join("\n");
}
function serialize(messages, system) {
  const toolNames = /* @__PURE__ */ new Map();
  for (const message of messages) {
    for (const block of message.content) {
      if (block.type === "tool-call") toolNames.set(String(block.id), block.name);
    }
  }
  const sections = [];
  if (system !== void 0 && system.length > 0) sections.push(`[\u7CFB\u7EDF\u6307\u4EE4]
${system}`);
  for (const message of messages) {
    const label = message.role === "system" ? "\u7CFB\u7EDF\u6307\u4EE4" : message.role === "assistant" ? "\u52A9\u624B" : message.source.kind === "tool" ? "\u5DE5\u5177\u7ED3\u679C" : "\u7528\u6237";
    sections.push(`${label}:
${serializeBlocks(message.content, toolNames)}`);
  }
  return sections.join("\n\n");
}

// plugins/dsh-llm-codex/src/app-server.ts
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
function object(value) {
  return typeof value === "object" && value !== null ? value : void 0;
}
function string(value) {
  return typeof value === "string" ? value : void 0;
}
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}
function approvalDecision(outcome) {
  if (outcome === "allowed-once") return "accept";
  if (outcome === "cancelled") return "cancel";
  return "decline";
}
function approvalReason(method, params) {
  const explicit = string(params.reason);
  const command = string(params.command);
  const cwd = string(params.cwd);
  const root = string(params.grantRoot);
  const pieces = [
    explicit,
    command === void 0 ? void 0 : `\u547D\u4EE4\uFF1A${command}`,
    cwd === void 0 ? void 0 : `\u5DE5\u4F5C\u76EE\u5F55\uFF1A${cwd}`,
    root === void 0 ? void 0 : `\u7533\u8BF7\u5199\u5165\u76EE\u5F55\uFF1A${root}`
  ].filter((part) => part !== void 0);
  if (pieces.length > 0) return pieces.join("\n");
  return method === "item/fileChange/requestApproval" ? "Codex \u8BF7\u6C42\u6267\u884C\u8D85\u51FA\u5F53\u524D\u5DE5\u4F5C\u533A\u7684\u6587\u4EF6\u4FEE\u6539\u3002" : "Codex \u8BF7\u6C42\u6267\u884C\u9700\u8981\u8D8A\u8FC7\u5F53\u524D\u6C99\u7BB1\u9650\u5236\u7684\u547D\u4EE4\u3002";
}
function toolName(method) {
  if (method === "item/fileChange/requestApproval" || method === "applyPatchApproval") {
    return "Codex \u6587\u4EF6\u4FEE\u6539";
  }
  return "Codex \u547D\u4EE4\u6267\u884C";
}
function sandboxPolicy(connection) {
  if (connection.sandboxMode === "danger-full-access") return { type: "dangerFullAccess" };
  if (connection.sandboxMode === "read-only") return { type: "readOnly", networkAccess: false };
  return {
    type: "workspaceWrite",
    writableRoots: [connection.cwd],
    networkAccess: false,
    excludeTmpdirEnvVar: false,
    excludeSlashTmp: false
  };
}
var AsyncQueue = class {
  values = [];
  waiters = [];
  closed = false;
  push(value) {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter === void 0) this.values.push(value);
    else waiter(value);
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) waiter(void 0);
  }
  async next() {
    const value = this.values.shift();
    if (value !== void 0) return value;
    if (this.closed) return void 0;
    return new Promise((resolve4) => {
      this.waiters.push(resolve4);
    });
  }
};
async function* streamViaAppServer(options) {
  const { connection, generation } = options;
  if (generation.sessionId === void 0) throw new Error("interactive approval requires a session id");
  const child = spawn(connection.bin, ["app-server", "--stdio"], {
    cwd: connection.cwd,
    env: { ...process.env, CODEX_HOME: connection.codexHome },
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true
  });
  child.stdin.setDefaultEncoding("utf8");
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const notifications = new AsyncQueue();
  const pending = /* @__PURE__ */ new Map();
  let nextRequestId = 1;
  let readerError;
  const send = (message) => {
    child.stdin.write(`${JSON.stringify(message)}
`);
  };
  const request = (method, params) => {
    const id = nextRequestId++;
    send({ id, method, params });
    return new Promise((resolve4, reject) => {
      pending.set(id, { resolve: resolve4, reject });
    });
  };
  const answerApproval = async (message) => {
    const id = message.id;
    const method = string(message.method);
    const params = object(message.params) ?? {};
    if (typeof id !== "number" && typeof id !== "string" || method === void 0) return;
    const outcome = await options.requestApproval({
      sessionId: generation.sessionId,
      toolName: toolName(method),
      reason: approvalReason(method, params),
      signal: generation.signal
    });
    if (method === "item/permissions/requestApproval") {
      const requested = object(params.permissions) ?? {};
      const permissions = {};
      if (outcome === "allowed-once") {
        const network = object(requested.network);
        const fileSystem = object(requested.fileSystem);
        if (network !== void 0) permissions.network = network;
        if (fileSystem !== void 0) permissions.fileSystem = fileSystem;
      }
      send({ id, result: { permissions, scope: "turn" } });
      return;
    }
    const decision = approvalDecision(outcome);
    send({ id, result: { decision } });
  };
  const reader = (async () => {
    try {
      const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
      for await (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        let message;
        try {
          message = object(JSON.parse(trimmed));
        } catch {
          continue;
        }
        if (message === void 0) continue;
        const method = string(message.method);
        const id = message.id;
        if (method !== void 0 && id !== void 0) {
          if (method === "item/commandExecution/requestApproval" || method === "item/fileChange/requestApproval" || method === "item/permissions/requestApproval" || method === "execCommandApproval" || method === "applyPatchApproval") {
            void answerApproval(message).catch((error) => {
              send({ id, error: { code: -32e3, message: error instanceof Error ? error.message : String(error) } });
            });
          } else {
            send({ id, error: { code: -32601, message: `Unsupported app-server request: ${method}` } });
          }
          continue;
        }
        if (typeof id === "number" && method === void 0) {
          const waiter = pending.get(id);
          if (waiter === void 0) continue;
          pending.delete(id);
          const error = object(message.error);
          if (error !== void 0) waiter.reject(new Error(string(error.message) ?? `app-server request ${id} failed`));
          else waiter.resolve(object(message.result) ?? {});
          continue;
        }
        if (method !== void 0) notifications.push(message);
      }
    } catch (error) {
      readerError = error instanceof Error ? error : new Error(String(error));
    } finally {
      notifications.close();
      const failure = readerError ?? new Error(stderr.trim() || "Codex app-server closed unexpectedly");
      for (const waiter of pending.values()) waiter.reject(failure);
      pending.clear();
    }
  })();
  const abort = () => {
    child.kill();
  };
  generation.signal?.addEventListener("abort", abort, { once: true });
  let pendingAgentMessage;
  let reasoningText = "";
  let reasoningIndex;
  let nextBlockIndex = 0;
  const emitReasoning = function* (text) {
    if (reasoningIndex === void 0) {
      reasoningIndex = nextBlockIndex++;
      yield { type: "block-start", index: reasoningIndex, blockType: "reasoning" };
    }
    reasoningText += text;
    yield { type: "reasoning-delta", index: reasoningIndex, text };
  };
  try {
    await request("initialize", {
      clientInfo: { name: "dsh-llm-codex", title: "DeepSeek Harness", version: "0.1.1" },
      capabilities: { experimentalApi: true, requestAttestation: false }
    });
    send({ method: "initialized" });
    const started = await request("thread/start", {
      model: generation.model,
      cwd: connection.cwd,
      approvalPolicy: "on-request",
      approvalsReviewer: "user",
      sandbox: connection.sandboxMode,
      ephemeral: true
    });
    const thread = object(started.thread);
    const threadId = string(thread?.id);
    if (threadId === void 0) throw new Error("Codex app-server returned no thread id");
    await request("turn/start", {
      threadId,
      input: [{ type: "text", text: options.prompt, text_elements: [] }],
      model: generation.model,
      sandboxPolicy: sandboxPolicy(connection),
      ...generation.reasoningEffort === void 0 ? {} : { effort: generation.reasoningEffort }
    });
    let completed = false;
    while (!completed) {
      const message = await notifications.next();
      if (message === void 0) break;
      const method = string(message.method);
      const params = object(message.params) ?? {};
      if (method === "item/completed") {
        const item = object(params.item);
        const type = string(item?.type);
        if (type === "agentMessage") {
          const text = string(item?.text);
          if (text !== void 0 && text.length > 0) {
            if (pendingAgentMessage !== void 0) yield* emitReasoning(`${pendingAgentMessage}
`);
            pendingAgentMessage = text;
          }
        } else if (type === "commandExecution") {
          const command = string(item?.command);
          yield* emitReasoning(command === void 0 ? "\u547D\u4EE4\u6267\u884C\u5B8C\u6210\n" : `\u547D\u4EE4\u6267\u884C\u5B8C\u6210\uFF1A${command}
`);
        } else if (type === "fileChange") {
          yield* emitReasoning("\u6587\u4EF6\u4FEE\u6539\u5B8C\u6210\n");
        }
      } else if (method === "turn/completed") {
        const turn = object(params.turn);
        const status = string(turn?.status);
        if (status === "failed") {
          const error = object(turn?.error);
          throw new Error(string(error?.message) ?? "Codex turn failed");
        }
        completed = true;
      } else if (method === "error") {
        const messageText = string(params.message);
        if (messageText !== void 0) yield* emitReasoning(`Codex\uFF1A${messageText}
`);
      }
    }
    if (!completed) throw readerError ?? new Error(stderr.trim() || "Codex app-server ended before turn completion");
    if (reasoningIndex !== void 0) {
      yield { type: "block-end", index: reasoningIndex, block: { type: "reasoning", text: reasoningText } };
    }
    if (pendingAgentMessage === void 0 || pendingAgentMessage.trim().length === 0) {
      yield { type: "finish", reason: { kind: "error", failure: { message: "Codex returned an empty response", code: "EMPTY_RESPONSE" } } };
      return;
    }
    const answer = pendingAgentMessage.trim();
    const textIndex = nextBlockIndex++;
    yield { type: "block-start", index: textIndex, blockType: "text" };
    yield { type: "text-delta", index: textIndex, text: answer };
    yield { type: "block-end", index: textIndex, block: { type: "text", text: answer } };
    yield { type: "usage", usage: { inputTokens: estimateTokens(options.prompt), outputTokens: estimateTokens(answer) } };
    yield { type: "finish", reason: { kind: "stop" } };
  } finally {
    generation.signal?.removeEventListener("abort", abort);
    if (child.exitCode === null) child.kill();
    await reader.catch(() => {
    });
  }
}

// plugins/dsh-llm-codex/src/adapter.ts
function modelInfo(provider, model) {
  return { provider, id: model.id, name: model.name ?? model.id, inputModalities: ["text"] };
}
function positiveSafeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : void 0;
}
function readCodexCachedModels(connection) {
  const codexHome = resolve3(expandHomePath(connection.codexHome ?? "~/.codex"));
  try {
    const document = JSON.parse(readFileSync(join2(codexHome, "models_cache.json"), "utf8"));
    return Array.isArray(document.models) ? document.models : [];
  } catch {
    return [];
  }
}
function discoverCodexModels(connection) {
  const seen = /* @__PURE__ */ new Set();
  const discovered = [];
  for (const cached of readCodexCachedModels(connection)) {
    if (typeof cached.slug !== "string" || cached.slug.length === 0 || cached.visibility !== "list") continue;
    if (seen.has(cached.slug)) continue;
    seen.add(cached.slug);
    const contextWindow = positiveSafeInteger(cached.max_context_window) ?? positiveSafeInteger(cached.context_window);
    discovered.push({
      id: cached.slug,
      ...typeof cached.display_name === "string" && cached.display_name.length > 0 ? { name: cached.display_name } : {},
      ...contextWindow === void 0 ? {} : { contextWindow }
    });
  }
  return discovered;
}
function resolveModelContextWindow(connection, model) {
  const cached = readCodexCachedModels(connection).find((entry) => entry.slug === model.id);
  const maximum = positiveSafeInteger(cached?.max_context_window);
  if (maximum !== void 0) return maximum;
  const normal = positiveSafeInteger(cached?.context_window);
  if (normal !== void 0) return normal;
  return model.contextWindow;
}
var CODEX_REASONING_LEVELS = [
  { id: "low", name: "\u4F4E" },
  { id: "medium", name: "\u4E2D" },
  { id: "high", name: "\u9AD8" },
  { id: "xhigh", name: "\u8D85\u9AD8" },
  { id: "max", name: "\u6700\u9AD8" },
  { id: "ultra", name: "\u6781\u81F4" }
];
async function isExecutable(path) {
  try {
    await access(path, process.platform === "win32" ? constants.F_OK : constants.X_OK);
    return true;
  } catch {
    return false;
  }
}
async function findOnPath(command) {
  const extensions = process.platform === "win32" ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";") : [""];
  for (const directory of (process.env.PATH ?? "").split(delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const hasExtension = process.platform !== "win32" || command.toLowerCase().endsWith(extension.toLowerCase());
      const candidate = join2(directory, `${command}${hasExtension ? "" : extension.toLowerCase()}`);
      if (await isExecutable(candidate)) return candidate;
      const upperCandidate = join2(directory, `${command}${hasExtension ? "" : extension.toUpperCase()}`);
      if (upperCandidate !== candidate && await isExecutable(upperCandidate)) return upperCandidate;
    }
  }
  return void 0;
}
async function resolveCodexBinary(configured) {
  if (configured === void 0 || configured.trim().length === 0) return findOnPath("codex");
  const value = expandHomePath(configured.trim());
  if (!isAbsolute(value) && !value.includes("/") && !value.includes("\\")) return findOnPath(value);
  const candidate = resolve3(value);
  return await isExecutable(candidate) ? candidate : void 0;
}
function estimateTokens2(text) {
  return Math.ceil(text.length / 4);
}
function stderrSummary(stderr, stdout) {
  const detail = (stderr.trim() || stdout.trim()).replace(/\s+/g, " ");
  return detail.length === 0 ? "codex CLI exited without an error message" : detail.slice(0, 1e3);
}
function killProcessTree(child, timeoutMs = 3e3) {
  return new Promise((resolveKill) => {
    if (child.pid === void 0 || child.exitCode !== null || child.signalCode !== null) {
      resolveKill();
      return;
    }
    if (process.platform !== "win32") {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
      resolveKill();
      return;
    }
    const killer = spawn2("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    });
    const fallback = () => {
      try {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      } catch {
      }
    };
    const timer = setTimeout(fallback, timeoutMs);
    killer.once("error", () => {
      clearTimeout(timer);
      fallback();
      resolveKill();
    });
    killer.once("exit", () => {
      clearTimeout(timer);
      resolveKill();
    });
  });
}
function record(value) {
  return typeof value === "object" && value !== null ? value : void 0;
}
function stringField(value, key) {
  const field = value[key];
  return typeof field === "string" ? field : void 0;
}
function numberField(value, key) {
  const field = value[key];
  return typeof field === "number" && Number.isFinite(field) && field >= 0 ? field : void 0;
}
function parseUsage(event) {
  const usage = record(event.usage);
  if (usage === void 0) return void 0;
  const totalInput = numberField(usage, "input_tokens");
  const outputTokens = numberField(usage, "output_tokens");
  if (totalInput === void 0 || outputTokens === void 0) return void 0;
  const cacheReadTokens = numberField(usage, "cached_input_tokens") ?? 0;
  const cacheWriteTokens = numberField(usage, "cache_write_input_tokens") ?? 0;
  const reasoningTokens = numberField(usage, "reasoning_output_tokens");
  return {
    inputTokens: Math.max(0, totalInput - cacheReadTokens - cacheWriteTokens),
    outputTokens,
    ...cacheReadTokens === 0 ? {} : { cacheReadTokens },
    ...cacheWriteTokens === 0 ? {} : { cacheWriteTokens },
    ...reasoningTokens === void 0 ? {} : { reasoningTokens }
  };
}
function describeItem(eventType, item) {
  const itemType = stringField(item, "type");
  if (itemType === "reasoning") return stringField(item, "text");
  if (itemType === "command_execution") {
    const command = stringField(item, "command");
    if (eventType === "item.started") return command === void 0 ? "\u6B63\u5728\u6267\u884C\u547D\u4EE4\n" : `\u6B63\u5728\u6267\u884C\u547D\u4EE4\uFF1A${command}
`;
    const exitCode = numberField(item, "exit_code");
    return exitCode === void 0 ? "\u547D\u4EE4\u6267\u884C\u7ED3\u675F\n" : `\u547D\u4EE4\u6267\u884C\u7ED3\u675F\uFF08\u9000\u51FA\u7801 ${exitCode}\uFF09
`;
  }
  if (itemType === "web_search") {
    const query = stringField(item, "query");
    return query === void 0 ? "\u6B63\u5728\u641C\u7D22\u7F51\u9875\n" : `\u6B63\u5728\u641C\u7D22\u7F51\u9875\uFF1A${query}
`;
  }
  if (itemType === "mcp_tool_call") {
    const tool = stringField(item, "tool") ?? stringField(item, "name");
    return tool === void 0 ? "\u6B63\u5728\u8C03\u7528 MCP \u5DE5\u5177\n" : `\u6B63\u5728\u8C03\u7528 MCP \u5DE5\u5177\uFF1A${tool}
`;
  }
  if (itemType === "file_change") return "\u6B63\u5728\u4FEE\u6539\u6587\u4EF6\n";
  if (itemType === "todo_list") return "\u6B63\u5728\u66F4\u65B0\u4EFB\u52A1\u8BA1\u5212\n";
  if (itemType === "error") {
    const message = stringField(item, "message") ?? stringField(item, "text");
    return message === void 0 ? "Codex \u62A5\u544A\u4E86\u6267\u884C\u9519\u8BEF\n" : `Codex \u6267\u884C\u9519\u8BEF\uFF1A${message}
`;
  }
  return void 0;
}
function waitForProcess(child, signal) {
  return new Promise((resolvePromise, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let settleTimer;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    const finish = (code, exitSignal) => {
      if (settled) return;
      settled = true;
      if (settleTimer !== void 0) clearTimeout(settleTimer);
      signal?.removeEventListener("abort", abort);
      resolvePromise({ code, signal: exitSignal, stdout, stderr });
    };
    const abort = () => {
      settleTimer = setTimeout(() => {
        finish(null, null);
      }, 5e3);
      void killProcessTree(child).then(() => {
        if (child.exitCode === null && child.signalCode === null) {
          try {
            child.kill("SIGKILL");
          } catch {
          }
        }
      });
    };
    child.once("error", reject);
    child.once("close", (code, exitSignal) => {
      finish(code, exitSignal);
    });
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}
var CodexAdapter = class extends LlmAdapter {
  constructor(config) {
    super();
    this.config = config;
  }
  providerInfo(provider) {
    return { id: provider, name: "Codex" };
  }
  listModels(provider) {
    return Promise.resolve(this.config.options().models.map((model) => modelInfo(provider, model)));
  }
  resolveModel(provider, model, _signal) {
    const connection = this.config.options();
    const configured = connection.models.find((entry) => entry.id === model);
    const contextWindow = configured === void 0 ? void 0 : resolveModelContextWindow(connection, configured);
    return Promise.resolve({
      ...configured === void 0 ? { provider, id: model, name: model, inputModalities: ["text"] } : modelInfo(provider, configured),
      ...contextWindow === void 0 ? {} : { context: { contextWindow } },
      ...configured?.maxTokens === void 0 ? {} : { defaultMaxTokens: configured.maxTokens },
      reasoning: {
        efforts: CODEX_REASONING_LEVELS,
        defaultEffort: this.config.options().defaultReasoningEffort ?? "low"
      }
    });
  }
  /**
   * Bind one generation's model metadata and dispatch to the same config
   * snapshot. The base LlmAdapter gained `prepareCall` in the 0.1.1-rc.2
   * series; a plugin bundled against an earlier dsh-llm re-implements the
   * delegation (no `override`, since the older base class does not declare it).
   */
  async prepareCall(provider, model, signal) {
    return {
      model: await this.resolveModel(provider, model, signal),
      stream: (options) => this.stream(options)
    };
  }
  async *stream(options) {
    const connection = this.config.options();
    const bin = await resolveCodexBinary(connection.codexPath);
    if (bin === void 0) {
      throw new LlmError("codex CLI \u672A\u627E\u5230:\u8BF7\u5728 llm-codex \u8BBE\u7F6E\u914D\u7F6E codexPath \u6216\u5B89\u88C5 codex \u5E76\u52A0\u5165 PATH", "UNAVAILABLE");
    }
    const codexHome = resolve3(expandHomePath(connection.codexHome ?? "~/.codex"));
    if (!existsSync(join2(codexHome, "auth.json"))) {
      throw new LlmError("\u8BF7\u5148\u8FD0\u884C codex login \u5B8C\u6210 ChatGPT \u767B\u5F55", "UNAVAILABLE");
    }
    if (options.signal?.aborted) {
      yield { type: "finish", reason: { kind: "aborted", failure: { message: "Codex request aborted by caller", code: "ABORTED" } } };
      return;
    }
    const prompt = serialize(options.messages, options.system);
    const cwd = connection.cwd === void 0 ? process.cwd() : resolve3(expandHomePath(connection.cwd));
    if (this.config.requestApproval !== void 0 && options.sessionId !== void 0) {
      try {
        yield* streamViaAppServer({
          connection: { bin, codexHome, cwd, sandboxMode: connection.sandboxMode },
          generation: options,
          prompt,
          requestApproval: this.config.requestApproval
        });
      } catch (error) {
        if (options.signal?.aborted) {
          yield { type: "finish", reason: { kind: "aborted", failure: { message: "Codex request aborted by caller", code: "ABORTED" } } };
          return;
        }
        yield {
          type: "finish",
          reason: {
            kind: "error",
            failure: {
              message: error instanceof Error ? error.message : String(error),
              code: "SERVER"
            }
          }
        };
      }
      return;
    }
    const outputFile = join2(tmpdir(), `dsh-codex-${randomUUID()}.txt`);
    const configuredModel = connection.models.find((entry) => entry.id === options.model);
    const contextWindow = configuredModel === void 0 ? void 0 : resolveModelContextWindow(connection, configuredModel);
    const baseArgs = [
      "exec",
      "--ephemeral",
      "--skip-git-repo-check",
      "-m",
      options.model,
      "-s",
      connection.sandboxMode,
      ...contextWindow === void 0 ? [] : ["-c", `model_context_window=${contextWindow}`],
      ...options.reasoningEffort === void 0 ? [] : ["-c", `model_reasoning_effort="${options.reasoningEffort}"`],
      "-o",
      outputFile
    ];
    const startCodex = (args) => {
      const child2 = spawn2(bin, args, {
        cwd,
        env: connection.codexHome === void 0 ? process.env : { ...process.env, CODEX_HOME: codexHome },
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        detached: process.platform !== "win32"
      });
      try {
        child2.stdin.end(prompt);
      } catch {
      }
      return child2;
    };
    let child = startCodex([...baseArgs.slice(0, 3), "--json", ...baseArgs.slice(3)]);
    try {
      let result;
      const processResult = waitForProcess(child, options.signal);
      const lines = createInterface2({ input: child.stdout, crlfDelay: Infinity });
      let nextBlockIndex = 0;
      let reasoningIndex;
      let reasoningText = "";
      let pendingAgentMessage;
      let actualUsage;
      try {
        for await (const line of lines) {
          if (options.signal?.aborted) break;
          const trimmed = line.trim();
          if (trimmed.length === 0) continue;
          let event;
          try {
            event = record(JSON.parse(trimmed));
          } catch {
            continue;
          }
          if (event === void 0) {
            continue;
          }
          const eventType = stringField(event, "type");
          const item = record(event.item);
          if (item !== void 0 && stringField(item, "type") === "agent_message") {
            const message = stringField(item, "text");
            if (message !== void 0 && message.length > 0) {
              if (pendingAgentMessage !== void 0) {
                if (reasoningIndex === void 0) {
                  reasoningIndex = nextBlockIndex++;
                  yield { type: "block-start", index: reasoningIndex, blockType: "reasoning" };
                }
                const delta = `${pendingAgentMessage}
`;
                reasoningText += delta;
                yield { type: "reasoning-delta", index: reasoningIndex, text: delta };
              }
              pendingAgentMessage = message;
            }
            continue;
          }
          if (eventType === "turn.completed") {
            actualUsage = parseUsage(event) ?? actualUsage;
            continue;
          }
          if (eventType !== void 0 && item !== void 0) {
            const activity = describeItem(eventType, item);
            if (activity !== void 0) {
              if (pendingAgentMessage !== void 0) {
                const delta = `${pendingAgentMessage}
`;
                if (reasoningIndex === void 0) {
                  reasoningIndex = nextBlockIndex++;
                  yield { type: "block-start", index: reasoningIndex, blockType: "reasoning" };
                }
                reasoningText += delta;
                yield { type: "reasoning-delta", index: reasoningIndex, text: delta };
                pendingAgentMessage = void 0;
              }
              if (reasoningIndex === void 0) {
                reasoningIndex = nextBlockIndex++;
                yield { type: "block-start", index: reasoningIndex, blockType: "reasoning" };
              }
              reasoningText += activity;
              yield { type: "reasoning-delta", index: reasoningIndex, text: activity };
            }
          }
        }
        result = await processResult;
      } catch (error) {
        if (options.signal?.aborted) {
          if (reasoningIndex !== void 0) {
            yield { type: "block-end", index: reasoningIndex, block: { type: "reasoning", text: reasoningText } };
            reasoningIndex = void 0;
          }
          yield { type: "finish", reason: { kind: "aborted", failure: { message: "Codex request aborted by caller", code: "ABORTED" } } };
          return;
        }
        throw new LlmError("codex CLI \u542F\u52A8\u5931\u8D25", "UNAVAILABLE", { cause: error });
      }
      const jsonFailure = `${result.stderr}
${result.stdout}`;
      const jsonOptionRejected = result.code !== 0 && /--json/i.test(jsonFailure) && /unexpected|unknown|unrecognized|invalid/i.test(jsonFailure);
      if (jsonOptionRejected && !options.signal?.aborted) {
        child = startCodex(baseArgs);
        try {
          result = await waitForProcess(child, options.signal);
        } catch (error) {
          if (!options.signal?.aborted) {
            throw new LlmError("codex CLI \u542F\u52A8\u5931\u8D25", "UNAVAILABLE", { cause: error });
          }
        }
      }
      if (options.signal?.aborted) {
        if (reasoningIndex !== void 0) {
          yield { type: "block-end", index: reasoningIndex, block: { type: "reasoning", text: reasoningText } };
          reasoningIndex = void 0;
        }
        yield { type: "finish", reason: { kind: "aborted", failure: { message: "Codex request aborted by caller", code: "ABORTED" } } };
        return;
      }
      if (reasoningIndex !== void 0) {
        yield { type: "block-end", index: reasoningIndex, block: { type: "reasoning", text: reasoningText } };
        reasoningIndex = void 0;
      }
      if (result.code !== 0) {
        const detail = stderrSummary(result.stderr, result.stdout);
        const auth = /(?:not signed in|sign in|please login|unauthori[sz]ed|authentication|401|403)/i.test(result.stderr);
        yield {
          type: "finish",
          reason: { kind: "error", failure: { message: detail, code: auth ? "AUTH" : "SERVER" } }
        };
        return;
      }
      const answer = existsSync(outputFile) ? readFileSync(outputFile, "utf8").trim() : "";
      if (answer.length === 0) {
        yield {
          type: "finish",
          reason: { kind: "error", failure: { message: "codex CLI returned an empty response", code: "EMPTY_RESPONSE" } }
        };
        return;
      }
      const textIndex = nextBlockIndex++;
      yield { type: "block-start", index: textIndex, blockType: "text" };
      yield { type: "text-delta", index: textIndex, text: answer };
      yield { type: "block-end", index: textIndex, block: { type: "text", text: answer } };
      yield {
        type: "usage",
        usage: actualUsage ?? { inputTokens: estimateTokens2(prompt), outputTokens: estimateTokens2(answer) }
      };
      yield { type: "finish", reason: { kind: "stop" } };
    } finally {
      if (child.exitCode === null) await killProcessTree(child);
      if (existsSync(outputFile)) unlinkSync(outputFile);
    }
  }
};

// plugins/dsh-llm-codex/src/index.ts
var name = "llm-codex";
var inject = ["llm", "agents", "approval"];
var NS = settingsNamespace("llm-codex");
var PROVIDER = "codex";
var DEFAULT_MODELS = [
  { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", contextWindow: 272e3 },
  { id: "gpt-5.6-terra", name: "GPT-5.6 Terra", contextWindow: 272e3 },
  { id: "gpt-5.6-luna", name: "GPT-5.6 Luna", contextWindow: 272e3 },
  { id: "gpt-5.5", name: "GPT-5.5", contextWindow: 272e3 },
  { id: "gpt-5.4", name: "GPT-5.4", contextWindow: 272e3 },
  { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", contextWindow: 272e3 }
];
var catalogModel = Schema.object({
  id: Schema.string().required(),
  name: Schema.string(),
  contextWindow: Schema.number().step(1).min(1),
  maxTokens: Schema.number().step(1).min(1)
});
var Config = Schema.object({
  codexPath: Schema.string(),
  codexHome: Schema.string(),
  cwd: Schema.string(),
  sandboxMode: Schema.union(["read-only", "workspace-write", "danger-full-access"]).default("read-only"),
  defaultReasoningEffort: Schema.union(["low", "medium", "high", "xhigh", "max", "ultra"]).default("low"),
  models: Schema.array(catalogModel).default(DEFAULT_MODELS)
});
function resolveModels(models) {
  const seen = /* @__PURE__ */ new Set();
  return (models ?? DEFAULT_MODELS).map((model) => {
    if (model.id.length === 0) throw new Error("llm-codex: catalog model ids must be non-empty");
    if (model.name !== void 0 && model.name.length === 0) {
      throw new Error(`llm-codex: catalog model "${model.id}" has an empty name`);
    }
    if (model.contextWindow !== void 0 && (!Number.isSafeInteger(model.contextWindow) || model.contextWindow <= 0)) {
      throw new Error(`llm-codex: catalog model "${model.id}" contextWindow must be a positive safe integer`);
    }
    if (model.maxTokens !== void 0 && (!Number.isSafeInteger(model.maxTokens) || model.maxTokens <= 0)) {
      throw new Error(`llm-codex: catalog model "${model.id}" maxTokens must be a positive safe integer`);
    }
    if (seen.has(model.id)) throw new Error(`llm-codex: duplicate catalog model "${model.id}"`);
    seen.add(model.id);
    return { ...model };
  });
}
function resolveAdapterOptions(config) {
  const stringOption = (value, field) => {
    if (value === void 0) return void 0;
    const trimmed = value.trim();
    if (trimmed.length === 0) return void 0;
    return trimmed;
  };
  const codexPath = stringOption(config.codexPath, "codexPath");
  const codexHome = stringOption(config.codexHome, "codexHome");
  const cwd = stringOption(config.cwd, "cwd");
  return {
    ...codexPath === void 0 ? {} : { codexPath },
    ...codexHome === void 0 ? {} : { codexHome },
    ...cwd === void 0 ? {} : { cwd },
    sandboxMode: config.sandboxMode ?? "read-only",
    defaultReasoningEffort: config.defaultReasoningEffort ?? "low",
    models: resolveModels(config.models)
  };
}
function apply(ctx, config) {
  let current = () => config;
  let lastRaw;
  let lastGood;
  const options = () => {
    const raw = current();
    if (raw === lastRaw && lastGood !== void 0) return lastGood;
    try {
      const next = resolveAdapterOptions(raw);
      lastRaw = raw;
      lastGood = next;
      return next;
    } catch (error) {
      if (lastGood === void 0) throw error;
      lastRaw = raw;
      ctx.logger.error("llm-codex: keeping the last good configuration after an invalid settings section");
      ctx.logger.error(error);
      return lastGood;
    }
  };
  options();
  const services = ctx;
  const adapter = new CodexAdapter({
    options,
    requestApproval: async (request) => {
      const agent = services.agents.get(request.sessionId);
      if (agent === void 0) return "unavailable";
      return services.approval.request({
        agent,
        toolName: request.toolName,
        reason: request.reason,
        signal: request.signal
      });
    }
  });
  ctx.llm.registerConfigurableProviders([
    { provider: PROVIDER, displayName: "Codex", settingsNs: NS, settingsPath: [] }
  ]);
  ctx.llm.registerAdapter([PROVIDER], adapter);
  ctx.llm.registerModelDiscovery(NS, async (request) => {
    if (request.signal?.aborted) return [];
    return discoverCodexModels(options());
  });
  installSettingsSection(ctx, NS, Config, config, {
    setSource: (source) => {
      current = source;
    },
    onChange: () => {
      options();
    }
  });
}
export {
  CodexAdapter,
  Config,
  apply,
  discoverCodexModels,
  inject,
  name,
  resolveAdapterOptions,
  resolveCodexBinary,
  resolveModelContextWindow,
  serialize
};
