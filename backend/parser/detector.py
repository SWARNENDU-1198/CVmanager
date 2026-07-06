import re

# Section headers regex mapping
SECTION_KEYWORDS = {
    "summary": [r"summary", r"objective", r"profile", r"about\s+me", r"professional\s+summary"],
    "education": [r"education", r"academic", r"degree", r"study", r"studies", r"qualification"],
    "skills": [r"skills", r"technologies", r"technical\s+skills", r"expertise", r"core\s+competencies", r"specialties"],
    "experience": [r"experience", r"employment", r"work\s+history", r"career", r"professional\s+experience", r"history"],
    "projects": [r"projects", r"personal\s+projects", r"key\s+projects", r"academic\s+projects"],
    "certifications": [r"certifications", r"licenses", r"certificates", r"credentials"],
    "achievements": [r"achievements", r"awards", r"honors", r"accomplishments"],
    "languages": [r"languages", r"linguistic\s+skills"]
}

def extract_contact_info(text: str) -> dict:
    info = {
        "email": "",
        "phone": "",
        "links": []
    }
    
    # Email regex
    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
    if email_match:
        info["email"] = email_match.group(0)
        
    # Phone regex (standard international and local formats)
    phone_match = re.search(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", text)
    if phone_match:
        info["phone"] = phone_match.group(0)
        
    # Link regex (GitHub, LinkedIn)
    links = re.findall(r"https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)", text)
    if links:
        for link in links:
            if "linkedin" in link.lower() or "github" in link.lower() or "portfolio" in link.lower():
                info["links"].append(link)
                
    return info

def detect_sections(text: str) -> dict:
    lines = text.split("\n")
    sections = {
        "name": "",
        "contact": {},
        "summary": "",
        "education": "",
        "skills": "",
        "experience": "",
        "projects": "",
        "certifications": "",
        "achievements": "",
        "languages": "",
        "other": ""
    }
    
    # Try to extract candidate name (usually the first few non-empty lines)
    non_empty_lines = [l.strip() for l in lines if l.strip()]
    if non_empty_lines:
        # Avoid picking email/phone as name
        name_candidate = non_empty_lines[0]
        if not ("@" in name_candidate or any(char.isdigit() for char in name_candidate) or "resume" in name_candidate.lower()):
            sections["name"] = name_candidate
        elif len(non_empty_lines) > 1:
            name_candidate = non_empty_lines[1]
            if not ("@" in name_candidate or any(char.isdigit() for char in name_candidate)):
                sections["name"] = name_candidate
    
    sections["contact"] = extract_contact_info(text)
    
    current_section = "other"
    section_text = []
    
    # Iterate lines and split by section headers
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
            
        # Check if line looks like a header (e.g. short, uppercase or capital, and matches keyword)
        is_header = False
        detected_section = None
        
        # Heading criteria: typically short (less than 5 words)
        if len(stripped.split()) <= 4:
            for sec_name, regexes in SECTION_KEYWORDS.items():
                for regex in regexes:
                    if re.search(r"^" + regex + r"\b", stripped.lower()):
                        is_header = True
                        detected_section = sec_name
                        break
                if is_header:
                    break
                    
        if is_header and detected_section:
            # Save previous section content
            if current_section:
                sections[current_section] = (sections[current_section] + "\n" + "\n".join(section_text)).strip()
            current_section = detected_section
            section_text = []
        else:
            section_text.append(line)
            
    # Save the last section
    if current_section:
        sections[current_section] = (sections[current_section] + "\n" + "\n".join(section_text)).strip()
        
    return sections
