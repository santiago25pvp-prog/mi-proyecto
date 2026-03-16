'use client'
import { useState, useEffect } from 'react'
import { adminService } from '../../services/adminService'

export const DocList = () => {
  const [docs, setDocs] = useState([])

  useEffect(() => {
    adminService.listDocuments().then(setDocs)
  }, [])

  const handleDelete = async (id: string) => {
    await adminService.deleteDocument(id)
    setDocs(docs.filter((d: any) => d.id !== id))
  }

  return (
    <div>
      {docs.map((doc: any) => (
        <div key={doc.id}>
          {doc.name}
          <button onClick={() => handleDelete(doc.id)}>Delete</button>
        </div>
      ))}
    </div>
  )
}
