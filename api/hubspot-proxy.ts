
export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { email, jobType, seniority, metadata } = request.body;
  const apiKey = process.env.HUBSPOT_API_KEY;

  if (!apiKey) {
    console.warn('HUBSPOT_API_KEY is not configured');
    return response.status(200).json({ status: 'skipped', message: 'HubSpot not configured' });
  }

  try {
    // 1. Create or Update Contact
    const hubspotResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          email: email,
          jobtitle: `${seniority} ${jobType}`, // Mapping to standard jobtitle
          // Custom properties if they exist in HubSpot:
          // job_type: jobType,
          // seniority: seniority,
          lifecyclestage: 'lead'
        }
      }),
    });

    if (!hubspotResponse.ok) {
      const errorData = await hubspotResponse.json();
      // If contact already exists, we might get a 409 Conflict
      if (hubspotResponse.status === 409) {
        console.log('HubSpot contact already exists, attempting update');
        // Try to update the existing contact
        // First, we need to find the contact ID. The 409 error usually returns the existing ID.
        // However, a simpler way is to use the "create or update" endpoint if available, 
        // or search by email then update.
        
        // Let's try to search for the contact by email to get the ID
        const searchResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filterGroups: [{
                    filters: [{
                        propertyName: 'email',
                        operator: 'EQ',
                        value: email
                    }]
                }]
            })
        });
        
        const searchData = await searchResponse.json();
        let contactId = null;
        if (searchData.total > 0 && searchData.results && searchData.results.length > 0) {
            contactId = searchData.results[0].id;
            // Update the contact
            await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    properties: {
                        jobtitle: `${seniority} ${jobType}`,
                        lifecyclestage: 'lead'
                    }
                })
            });
            return response.status(200).json({ status: 'updated', id: contactId });
        }
        
        return response.status(200).json({ status: 'exists_no_update' });
      }
      throw new Error(`HubSpot API error: ${JSON.stringify(errorData)}`);
    }

    const data = await hubspotResponse.json();
    return response.status(200).json({ status: 'success', id: data.id });

  } catch (error: any) {
    console.error('HubSpot Integration Error:', error);
    // Don't fail the whole request if HubSpot fails, just log it
    return response.status(200).json({ status: 'error', message: error.message });
  }
}
