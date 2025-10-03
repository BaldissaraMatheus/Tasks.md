/**
 * Utility functions for manipulating card content (tags, due dates, etc.)
 * These functions are shared between single-card editor and bulk operations
 */

/**
 * Add a tag to card content
 * @param {string} content - Current card content
 * @param {string} tagName - Tag name to add
 * @returns {string} Updated content with tag added
 */
export function addTagToContent(content, tagName) {
  const actualContent = content || "";
  const emptyLineIfFirstTag = [...actualContent.matchAll(/\[tag:(.*?)\]/g)]
    .length
    ? ""
    : "\n\n";
  const newTag = tagName.trim();
  return `[tag:${newTag}] ${emptyLineIfFirstTag}${actualContent}`;
}

/**
 * Remove a tag from card content
 * @param {string} content - Current card content
 * @param {string} tagName - Tag name to remove
 * @returns {string} Updated content with tag removed
 */
export function removeTagFromContent(content, tagName) {
  const currentContent = content || "";
  const tagWithBrackets = `[tag:${tagName}]`;
  const tagWithBracketsAndSpace = `${tagWithBrackets} `;
  let tagLength = tagWithBracketsAndSpace.length;
  let indexOfTag = currentContent
    .toLowerCase()
    .indexOf(tagWithBracketsAndSpace.toLowerCase());
  
  if (indexOfTag === -1) {
    indexOfTag = currentContent.toLowerCase().indexOf(tagWithBrackets.toLowerCase());
    tagLength = tagWithBrackets.length;
  }
  
  if (indexOfTag === -1) {
    return currentContent; // Tag not found
  }
  
  return `${currentContent.substring(0, indexOfTag)}${currentContent.substring(indexOfTag + tagLength, currentContent.length)}`;
}

/**
 * Set or update due date in card content
 * @param {string} content - Current card content
 * @param {string} newDueDate - New due date (YYYY-MM-DD format)
 * @returns {string} Updated content with due date set/updated
 */
export function setDueDateInContent(content, newDueDate) {
  const currentContent = content || "";
  
  // Check if card already has a due date
  const dueDateStringMatch = currentContent.match(/\[due:(.*?)\]/);
  const existingDueDate = dueDateStringMatch?.[1];
  
  const newDueDateTag = `[due:${newDueDate}]`;
  
  if (existingDueDate) {
    // Replace existing due date
    return currentContent.replace(`[due:${existingDueDate}]`, newDueDateTag);
  } else {
    // Add new due date at the beginning
    return `${newDueDateTag}\n\n${currentContent}`;
  }
}

/**
 * Extract tags from card content
 * @param {string} content - Card content
 * @returns {string[]} Array of tag names
 */
export function getTagsFromContent(content) {
  const text = content || "";
  const tags = [...text.matchAll(/\[tag:(.*?)\]/g)]
    .map((tagMatch) => tagMatch[1].trim())
    .filter((tag) => tag !== "");
  return tags;
}

/**
 * Extract due date from card content
 * @param {string} content - Card content
 * @returns {string|null} Due date string or null if not found
 */
export function getDueDateFromContent(content) {
  if (!content) {
    return null;
  }
  const dueDateStringMatch = content.match(/\[due:(.*?)\]/);
  if (!dueDateStringMatch?.length) {
    return null;
  }
  return dueDateStringMatch[1];
}
