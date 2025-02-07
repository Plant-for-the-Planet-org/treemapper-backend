const adjectives = [
    'Urban',
    'Forest',
    'Green',
    'Global',
    'Smart',
    'Eco',
    'Digital',
    'Modern',
    'Advanced',
    'Pro',
    'Enterprise',
    'Community',
    'Regional',
    'Local',
    'Dynamic',
    'Sustainable',
    'Connected',
    'Innovative',
    'Precision',
    'Future'
  ];
  
  const projectTypes = [
    'Initiative',
    'Project',
    'Survey',
    'Analysis',
    'Network',
    'Hub',
    'System',
    'Platform'
  ];
  
  function generateProjectName() {
    // Get random adjective
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    
    // Get random project type
    const projectType = projectTypes[Math.floor(Math.random() * projectTypes.length)];
    
    // Generate a random number between 1 and 999
    const randomNumber = Math.floor(Math.random() * 999) + 1;
    
    // 50% chance to include the number in the name
    const includeNumber = Math.random() < 0.5;
    
    // Build the name
    let projectName = `${adjective} TreeMapper`;
    
    // Add project type with 70% probability
    if (Math.random() < 0.7) {
      projectName += ` ${projectType}`;
    }
    
    // Add number if includeNumber is true
    if (includeNumber) {
      projectName += ` ${randomNumber}`;
    }
    
    return projectName;
  }
  
  // Function to generate slug from project name
  function generateProjectSlug(projectName) {
    return projectName
      .toLowerCase()
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, '') // Remove any characters that aren't letters, numbers, or hyphens
      .replace(/-+/g, '-')      // Replace multiple consecutive hyphens with a single hyphen
      .replace(/^-|-$/g, '');   // Remove hyphens from start and end
  }
  
  // Export both functions
  export { generateProjectName, generateProjectSlug };
  
  // Example usage:
  // const projectName = generateProjectName();
  // console.log(projectName); // e.g., "Smart TreeMapper Platform 123"
  // console.log(generateProjectSlug(projectName)); // e.g., "smart-treemapper-platform-123"