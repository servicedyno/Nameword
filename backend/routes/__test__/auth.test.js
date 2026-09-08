const request = require('supertest');
const app = require('../../app');


it('returns a 201 on successful signup', async()=>{
    return request(app)
            .post('/api/v1/auth/register')
            .send({
                name:"Test user",
                email:"test@test.com",
                password:"password",
                mobile:"+919041475880",
                passwordConfirmation:"password"
            })
            .expect(201)
});

it('returns a 422  with an invalid Email', async()=>{
    return request(app)
            .post('/api/v1/auth/register')
            .send({
                name:"Test user",
                email:"testtest.com",
                password:"password",
                mobile:"+919041475880",
                passwordConfirmation:"password"
            })
            .expect(422)
});

it('returns a 422  with an invalid password', async()=>{
    return request(app)
            .post('/api/v1/auth/register')
            .send({
                name:"Test user",
                email:"test@test.com",
                password:"pa",
                mobile:"+919041475880",
                passwordConfirmation:"password"
            })
            .expect(422)
});

it('returns a 422  with missing email and password', async()=>{
    return request(app)
            .post('/api/v1/auth/register')
            .send({
                name:"Test user",
                mobile:"+919041475880",
                passwordConfirmation:"password"
            })
            .expect(422)
});

it('it disallows duplicate emails', async()=>{
    await request(app)
        .post('/api/v1/auth/register')
        .send({
            name:"Test user",
            email:"test@test.com",
            password:"password",
            mobile:"+919041475880",
            passwordConfirmation:"password"
        })
        .expect(201)
    return request(app)
            .post('/api/v1/auth/register')
            .send({
                name:"Test user",
                email:"test@test.com",
                password:"password",
                mobile:"+919041475880",
                passwordConfirmation:"password"
            })
            .expect(422)
});


// it('returns a 200 on successful signin', async()=>{

//     await request(app)
//             .post('/api/v1/auth/register')
//             .send({
//                 name:"Test user",
//                 email:"test@test.com",
//                 password:"password",
//                 mobile:"+919041475880",
//                 passwordConfirmation:"password"
//             })
//             .expect(201)
//     return request(app)
//             .post('/api/v1/auth/login')
//             .send({
//                 email:"test@test.com",
//                 password:"password",
//             })
//             .expect(200)
// });