const express = require('express');
const path = require('path');
const axios = require('axios');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;
const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const CUSTOM_OBJECT_TYPE = process.env.CUSTOM_OBJECT_TYPE; // e.g. "2-1234567" or "p_pet" or "p{portal}_pet"


if (!HUBSPOT_TOKEN || !CUSTOM_OBJECT_TYPE) {
    console.error('\nMissing env vars. Set HUBSPOT_ACCESS_TOKEN and CUSTOM_OBJECT_TYPE in .env');
    process.exit(1);
}


app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));


const hubspot = axios.create({
    baseURL: 'https://api.hubapi.com',
    headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        'Content-Type': 'application/json'
    },
    timeout: 15000
});


// 1) Homepage — list records
app.get('/', async (req, res) => {
    try {
        const params = new URLSearchParams({
            properties: ['name', 'species', 'bio'].join(','),
            limit: '100',
            archived: 'false'
        }).toString();


        const url = `/crm/v3/objects/${encodeURIComponent(CUSTOM_OBJECT_TYPE)}?${params}`;
        const { data } = await hubspot.get(url);


        const rows = (data.results || []).map(r => ({ id: r.id, properties: r.properties || {} }));
        res.render('homepage', { rows, flash: req.query.flash });
    } catch (err) {
        const msg = err?.response?.data?.message || err.message || 'Unknown error';
        res.status(500).render('homepage', { rows: [], error: `Failed to fetch records: ${msg}` });
    }
});


// 2) GET form — render updates.pug
app.get('/update-cobj', (req, res) => {
    res.render('updates', { title: 'Update Custom Object Form | Integrating With HubSpot I Practicum' });
});


// 3) POST form — create a new record
app.post('/update-cobj', async (req, res) => {
    const { name, species, bio } = req.body;
    try {
        await hubspot.post(`/crm/v3/objects/${encodeURIComponent(CUSTOM_OBJECT_TYPE)}`, {
            properties: { name, species, bio }
        });
        res.redirect('/?flash=Record%20created');
    } catch (err) {
        const msg = err?.response?.data?.message || err.message || 'Unknown error';
        res.status(400).render('updates', {
            title: 'Update Custom Object Form | Integrating With HubSpot I Practicum',
            error: `Failed to create record: ${msg}`
        });
    }
});


app.listen(PORT, () => {
    console.log(`App running at http://localhost:${PORT}`);
});