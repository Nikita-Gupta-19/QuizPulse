from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from app.database.connection import get_db
from app.analytics.engine import AnalyticsEngine

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard")
async def get_dashboard(db = Depends(get_db)):
    """
    Exposes high-level KPI summaries (DAU, WAU, completion rate, avg response time).
    """
    try:
        data = await AnalyticsEngine.get_dashboard_summary(db)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to aggregate dashboard: {str(e)}")

@router.get("/activity")
async def get_activity(db = Depends(get_db)):
    """
    Exposes time-series and volume metrics (DAU history, Peak activity, Daily served/answered).
    """
    try:
        data = await AnalyticsEngine.get_activity_charts(db)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compile activity trends: {str(e)}")

@router.get("/performance")
async def get_performance(db = Depends(get_db)):
    """
    Exposes accuracy ratios (subject-wise accuracy, chapter difficulty heatmaps, speeds, skips).
    """
    try:
        data = await AnalyticsEngine.get_performance_charts(db)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to gather performance insights: {str(e)}")

@router.get("/dropoff")
async def get_dropoff(db = Depends(get_db)):
    """
    Exposes stages cohort dropoff details.
    """
    try:
        data = await AnalyticsEngine.get_dropoff_funnel(db)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract drop-off funnel: {str(e)}")

@router.get("/export")
async def export_csv(db = Depends(get_db)):
    """
    Exports standard quiz history logs to CSV format.
    """
    try:
        csv_content = await AnalyticsEngine.generate_csv_report(db)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=quizpulse_analytics_report.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate CSV: {str(e)}")
