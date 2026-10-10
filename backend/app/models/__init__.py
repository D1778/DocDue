from app.models.alert_log import AlertLog
from app.models.document import DocumentRecord
from app.models.tenant import Tenant
from app.models.user import User

# Every Beanie model must be listed here, or its collection and indexes are never created
ALL_MODELS = [Tenant, User, DocumentRecord, AlertLog]