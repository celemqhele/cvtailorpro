// api/hubspot-lead.ts
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, jobType, seniority, metadata } = req.body;
    const apiKey = process.env.HUBSPOT_API_KEY;

    if (!apiKey) {
      console.warn("HUBSPOT_API_KEY is not set. Skipping HubSpot sync.");
      return res.status(200).json({ success: true, message: "HubSpot key missing, skipped." });
    }

    const hubspotResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          email: email,
          jobtitle: jobType || metadata?.job_title || '',
          lifecyclestage: seniority || 'lead',
          company: metadata?.company_name || ''
        }
      })
    });

    const data = await hubspotResponse.json();

    if (!hubspotResponse.ok) {
      if (data.category === 'CONFLICT') {
        return res.status(200).json({ success: true, message: "Contact already exists." });
      } else {
        return res.status(400).json({ error: data.message || "HubSpot API error" });
      }
    }

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
