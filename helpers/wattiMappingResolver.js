/**
 * Safely resolves nested property paths against an object (dependency-free alternative to lodash.get)
 * @param {Object} obj - Context object
 * @param {string} path - Dotted path (e.g. 'user.name')
 * @param {any} fallback - Fallback value if resolved value is null/undefined
 */
const getNestedValue = (obj, path, fallback = "") => {
  if (!obj || !path) return fallback;
  const value = path.split(".").reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : undefined;
  }, obj);
  return value !== undefined && value !== null ? value : fallback;
};

/**
 * Resolves saved dynamic/static template body mappings into a Watti parameters array.
 * @param {Object} bodyMappings - JSON body_mappings from watti_template_configs
 * @param {Object} contextData - Context object containing entities: { user, promo, transaction, store }
 */
const resolveWattiParameters = (bodyMappings, contextData = {}) => {
  if (!bodyMappings) return [];

  return Object.keys(bodyMappings).map((paramName) => {
    const config = bodyMappings[paramName];


    return {
      name: paramName,
      value: String(config.value !== undefined && config.value !== null ? config.value : ""),
    };

  });
};

/**
 * Resolves the dynamic/static header image value for Watti media headers.
 * @param {Object} config - The watti_template_configs database record
 * @param {Object} contextData - Context object containing entities
 */
const resolveWattiHeaderImage = (config, contextData = {}) => {
  if (!config || config.header_type !== "IMAGE" || !config.header_mapping_value) {
    return null;
  }

  if (config.header_mapping_type === "static") {
    return config.header_mapping_value;
  }

  if (config.header_mapping_type === "dynamic") {
    return getNestedValue(contextData, config.header_mapping_value, null);
  }

  return null;
};

module.exports = {
  getNestedValue,
  resolveWattiParameters,
  resolveWattiHeaderImage,
};
