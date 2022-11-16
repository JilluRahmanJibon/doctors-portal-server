const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000
const app = express()


app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jf2skzr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const appointmentOptionsCollection = client.db('doctorsPortal').collection('appointmentOptions')
const bookingsCollection = client.db('doctorsPortal').collection('bookings')
try {

    // post methods 
    app.post('/bookings', async (req, res) => {
        const booking = req.body
        const result = await bookingsCollection.insertOne(booking)
        res.send(result)
    })
    // get methods 
    app.get('/appointmentOptions', async (req, res) => {
        const date = req.query.date
        const bookedOptions = { appointmentDate: date }
        const alreadyBooked = await bookingsCollection.find(bookedOptions).toArray()
        const query = {}
        const options = await appointmentOptionsCollection.find(query).toArray()
        options.forEach(option => {
            const optionsName = alreadyBooked.filter(book => book.treatment === option.name)
            const bookingSlots = optionsName.map(book => book.slot)
            const remainingSlots = option.slots.filter(slot => !bookingSlots.includes(slot))
            option.slots = remainingSlots

        })
        res.send(options)
    })
    app.get('/v2/appointmentOptions', async (req, res) => {
        const date = req.query.date
        const options = await appointmentOptionsCollection.aggregate([
            {
                $lookup:
                {
                    from: 'bookings',
                    localField: 'name',
                    foreignField: 'treatment',
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq:['$appointmentDate',date]
                                }
                        }}
                    ],
                    as: 'booked',
                    
                }

            }, {
                $project: {
                    name: 1,
                    slots: 1, booked: {
                        $map: {
                            input: '$booked',
                            as: 'book',
                            in:'$$book.slot'
                        }
                    }
                }
            }, {
                
            }
        ])
    })

}
catch (err) { console.log(err.message) }

app.get('/', (req, res) => {
    res.send('Doctors portal server is running')
})







app.listen(port, () => {
    console.log('Post is running', port);
})