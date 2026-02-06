-- Tax documents table
CREATE TABLE IF NOT EXISTS tax_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    year INT NOT NULL,
    description TEXT,
    document_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tax document tags junction table
CREATE TABLE IF NOT EXISTS tax_document_tags (
    tax_document_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (tax_document_id, tag_id),
    FOREIGN KEY (tax_document_id) REFERENCES tax_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
