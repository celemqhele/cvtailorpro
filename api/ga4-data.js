
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export default async function handler(req, res) {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  // Handle both literal newlines and escaped newlines
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!propertyId || !clientEmail || !privateKey) {
    return res.status(500).json({ 
      error: 'GA4 credentials not configured. Please set GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, and GA4_PRIVATE_KEY in environment variables.' 
    });
  }

  try {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });

    // 1. Real-time users (active in last 30 mins)
    const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: 'activeUsers' }],
    });

    // 2. Daily active users (last 30 days) for traffic graph
    const [dailyResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    });

    // 3. Page views by path
    const [pageViewsResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      limit: 10
    });

    // 4. Event counts (CV generations, purchases)
    const [eventsResponse] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
    });

    res.status(200).json({
      realtime: {
        activeUsers: realtimeResponse.rows?.[0]?.metricValues?.[0]?.value || "0"
      },
      daily: dailyResponse.rows?.map(row => ({
        date: row.dimensionValues[0].value,
        users: row.metricValues[0].value
      })) || [],
      pageViews: pageViewsResponse.rows?.map(row => ({
        path: row.dimensionValues[0].value,
        views: row.metricValues[0].value
      })) || [],
      events: eventsResponse.rows?.map(row => ({
        name: row.dimensionValues[0].value,
        count: row.metricValues[0].value
      })) || []
    });
  } catch (error) {
    console.error('GA4 API Error:', error);
    res.status(500).json({ error: error.message });
  }
}
