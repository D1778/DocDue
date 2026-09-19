from fastapi import FastAPI
app=FastAPI(
    title="DocDue API",
    description="DocDue - Document Expiry tracking SaaS - backend API",
    version="0.1.0"
)
@app.get("/")
def health_check():
    return {"status":"ok","message":"DocDue API is running"}