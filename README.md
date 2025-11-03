# TCSS460-Group7-Credential-API
 
RESTful API for Identity and Access Management (IAM) providing secure authentication, authorization, and user credential management with JWT tokens, email verification, phone verification, and role-based access control


### Live API: https://tcss460-group7-credential-api-8zqv.onrender.com/

### Documentation:: https://tcss460-group7-credential-api-8zqv.onrender.com/api-docs

### Link to the TVShow API: https://github.com/shiro-z117/TCSS-460-Group-7-tv-shows-dataset-api

---

## Production Version Sprint Meetings

### Discussion 1
- **Date:** Monday, October 27, 2025
- **Time:** 3:30 PM - 4:15 PM (45 minutes)
- **Location:** In-Person
#### Actions:
- Planned credentials API
- Planned review of dataset API

### Discussion 2
- **Date:** Sunday, November 2, 2025
- **Time:** 8:00 PM - 9:00 PM (45 minutes)
- **Location:** Discord
#### Actions:
- Checked in with group to ensure APIs are working
---

## Production Version Sprint Contributions

### Patrick
- Organized Credentials API Plan
- Implented endpoints
  - GET /admin/users/:id
  - PUT /admin/users/:id
  - DELETE /admin/users/:id
  - PUT /admin/users/:id/password
- Added Tests for endpoints in Postman
- Created Auth Middleware
- Made Unit tests for Auth Middleware
### Linda Miao - MiddleWay create & testing
### MiddleWay created completed
- validateLogin – validates email and password format.
- validateRegister – ensures valid email, password, and matching confirmation fields.
- validatePasswordResetRequest – validates user email for reset.
- validatePasswordReset – checks reset token and new password.
- validatePasswordChange – validates old vs. new password fields.
- validatePhoneSend – checks for valid carrier.
- validatePhoneVerify – validates 6-digit verification code.
- validateEmailToken – ensures token parameter presence.
- validateUserIdParam – validates numeric or UUID user ID parameter.
- passwordStrength (optional) – verifies strong password requirements.
- validatePagination – validates pagination parameters (page, limit).
### Testing completing.
  

### Shiannel - Database, Deployment, & Admin API Endpoints
### What Was Completed
- Set up and hosted PostgreSQL database on Supabase with a complete users table schema
- Deployed Credentials API to Render and connected to Supabase database with environment variables
- Configured production environment and verified database connectivity
- Created Swagger/OpenAPI documentation for 9 admin endpoints at /api-docs
- Implemented 5 admin endpoints with role-based access control:
   - POST /admin/users/create (create users with specified roles)
   - GET /admin/users (list users with pagination and filters)
   - GET /admin/users/search (search users by name/email/username)
   - PUT /admin/users/:id/role (change user roles with hierarchy enforcement)
   - GET /admin/users/stats/dashboard (comprehensive dashboard statistics)
   - 
Files: docs/swagger.yaml, src/controllers/adminController.ts, src/routes/admin/index.ts

### Shiraz
- Verified that each endpoint is working as intended, and fixed it if not
- Cleaned up API codebase

### Bao - Worked with Linda for MiddleWay create & testing


---

## Production Version Sprint Comments

### Patrick
Was easier to organize this sprint since we had done it for the web api.

### Linda Miao
### Challenges:
To test is a little challenge that conflict with existing file that I can not change by my role. But finally, that's all passing test by Bao's support. 

### Shiannel - Database, Deployment, & Admin API Endpoints
### Challenges: 
First time deploying to the cloud took some trial and error to get the database connection working. 
Working with Render and Supabase was new territory for me and was a struggle to get used to and 
figure out what was wrong.

#### What Went Well:
Already knew Swagger from last week, so the documentation was much faster this time
Team communicated well on Discord - no code conflicts when merging this week
Admin endpoints all worked after testing locally

### Shiraz
API is now fully functional, but the code is a little inconsistent 

### Bao
---

## Beta II Sprint Meetings
### Discussion 1
- **Date:** Monday, October 20, 2025
- **Time:** 3:30 PM - 4:00 PM (30 minutes)
- **Location:** In-Person
#### Actions:
- Planned out the week
- Prepared to organize database tables 

### Discussion 2
- **Date:** Thursday, October 23, 2025
- **Time:** 6:00 PM - 7:00 PM (60 minutes)
- **Location:** Discord
#### Actions:
- Checked in on progress
- Planned out remaining endpoints to implement

### Discussion 3
- **Date:** Sunday, October 26, 2025
- **Time:** 8:00 PM - 10:00 PM (120 minutes)
- **Location:** Discord
#### Actions:
- Merged everyone's branches into main and resolved merge conflicts
- Finalized other aspects, such as documentation and postman tests

---

## Beta II Sprint Contributions
### Patrick
### What Was Completed
- Built and tested 5 GET endpoints with Postman:
  - GET /api/shows/:id, 
  - PATCH /api/shows/:id, 
  - POST/PATCH/DELETE /api/shows/:id/cast, 
  - Updated database queries with cast and show update functions.
  - created tests for all above endpoints
### Linda Miao - Database Setup & API Endpoint Development
### What Was Completed
- Re-imported 7,382 TV shows from professor's CSV file into Supabase(relationshiop and other debug solve by team member)
- Built and tested 4 GET endpoints with Postman:
  - GET /studios (search studios by name with pagination)
  - GET /years/first (filter first air years by year range)
  - GET /years/last (filter last air years by year range)
  - GET /seasons (get season counts with bucketing option)
- Database is production-ready for API development

### Shiannel - API Designer & Swagger Documentation
### What Was Completed
- Documented API endpoints for the TV Shows API
- Created a complete Swagger/OpenAPI request/response format, data schemas, and error handling
- Built and tested 3 GET endpoints with Postman:
  - GET /health (check API health and database status)
  - GET /shows/:id/images (get posters, backdrops, and logos with type filtering)
  - GET /shows/:id/cast (get actor and character info with sorting options)
- Coordinated with the team to document their endpoints (filters, search, admin operations)
- **Files:** `project_files/swagger.yaml`

### Shiraz
- Imported all remaining data to tables on Supabase
- Implemented junction tables to handle relationships between rows on different tables
- Implemented admin endpoints (PATCH status/dates/metrics for a selected show)
- Merged all branches into main
- Cleaned up project files

### Bao
- Built and test the following endpoints on local and render:
  - GET /shows/random (get one random show)
  - GET /shows/:id (get full details for one show by numeric/string :id)
  - GET /genres (get distinct list of genres)
  - GET /networks (get distinct list of networks)
  - GET /statuses (get distinct list of show statuses)
  - GET /shows (get list of shows)

---

## Beta II Sprint Comments

### Patrick

### Linda Miao - Database Setup & API Endpoint Development
**Challenges & Solutions**
- Data Population (95% complete): Attempted Python scripts initially, but SQL UPDATE queries in Supabase worked better (faster, avoided API caching issues). Team collaboration solved this.
- Database Relationships: First time recreating junction tables after Supabase reload. Learned how many-to-many relationships work.Team collaboration solved this.
- API Endpoint Development: First endpoint took longest to understand layer architecture (queries.ts → controller → routes). After pattern established, remaining 3 endpoints built faster.
- Data Type Issues: Year values returned as strings. Fixed by adding `.map()` conversion in controller layer.

**Key Learnings**
1. SQL more efficient than Python for bulk operations
2. Layered API architecture: Database → Controller → Routes
3. TypeScript compiles before testing (npx tsc)
4. Always test SQL queries in database first
5. Git branching keeps main branch safe

### Shiannel
- Swagger/OpenAPI specification completed, validated, and pushed to GitHub
- All endpoints documented, including CRUD operations, filter vocab, search features, and admin operations
- Data schemas defined for shows, cast, images, pagination, and error responses
- Health, images, and cast endpoints built and tested with Postman
- Documentation at `project_files/swagger.yaml`

### Shiraz
- Merging numerous branches can be painful, git is kind of finnicky with what it considers a conflict (sometimes even formatting counts)

### Bao

---

## Beta Sprint Meetings
### Discussion 1
- **Date:** Thursday, October 17, 2025
- **Time:** 12:30 PM - 1:00 PM (30 minutes)
- **Location:** Discord
#### Actions:
-Deployment tool decided: Render
- Assigned roles for this week:
- - Patrick: API Development
- - Linda: Database & Integration
- - Shiannel: Documentation & GitHub Pages
- - Bao: Testing & Quality Assurance
- - Shiraz: Deployment & DevOps

### Discussion 2
- **Date:** Sunday, October 19, 2025
- **Time:** 8:00 PM - 9:15 PM (75 minutes)
- **Location:** Discord
#### Actions:
- Fixed /api-docs endpoint
- Planned ahead for Beta Sprint II

---

## Beta Sprint Contributions

### Patrick
- Completed 3 API endpoints
- Connect API to Supabase database
- Helped fix Pv4/IPv6 compatibility issue
### Linda Miao - Database & API Integration

**Responsibilities:**
- Set up Supabase database and created connection/query functions
- Fixed IPv4/IPv6 compatibility issue using Session pooler
- Created Express server with working API routes
- Built and tested endpoints locally
- Created Postman test collection

**Files Created:** 
- db/connection.js, db/queries.js
- server.js - Express server with API routes
- testing/postman/postman.json - Postman tests

**Testing:**
- All routes tested and return variable data 
- Database queries working correctly 

**Routes Implemented:**
- `GET /health` - Health check endpoint
- `GET /api/shows` - Returns all TV shows
- `GET /api/shows/by-genre/:genre` - Filter shows by genre


### Shiannel
**Responsibilities:**
- Created comprehensive Swagger/OpenAPI specification for Beta Sprint endpoints
- Designed and developed an interactive API documentation website with Swagger UI
- Set up GitHub Pages documentation structure in `/docs` folder
- Documented all three implemented endpoints with request/response examples
- Added query parameter validation and error response documentation
- Created a quick start guide and usage examples for developers

**Files Created:**
- `docs/swagger.yaml` - Complete OpenAPI 3.0 specification for implemented endpoints
- `docs/index.html` - Interactive documentation website with Swagger UI integration

**Endpoints Documented:**
- `GET /health` - Health check endpoint to verify API status
- `GET /api/shows` - Retrieve all TV shows from the dataset
- `GET /api/shows/by-genre/{genre}` - Filter TV shows by specific genre (e.g., Drama)

### Bao
**Responsibilities:**
- Testing the endpoints of the API
- Make sure the data return is correct
- Making Postman collection for testing API endpoints
- Create Readme file for the testing
- Investigate the deployment issues on Render with other team members

**Files Created:**
- `testing/postman/postman.json` - JSON file to import the postman collection for testing
- `testing/postman/README.md` - The readme file of postman testing collection

### Shiraz
**Responsibilities:**
- Testing API endpoints
- Deploying API to Render
- Investigating deployment issues (failure to connect, IPv mismatch, etc)
---

## Beta Sprint Comments

### Patrick

### Linda Miao
**Challenges:**
- IPv4/IPv6 compatibility issue required research and testing
- Infrastructure issues discovered through collaborative troubleshooting

**Learning:**
- Testing locally caught issues early
- Team adapted quickly to problems
- Session pooler solved the connection issue

### Shiannel
**What Worked Well:**
- Created comprehensive API documentation with implemented endpoints from group member
- Swagger UI integration provides interactive testing capabilities
- GitHub Pages deployed successfully, and documentation is live
- Coordination with team members to understand API structure

**Challenges:**
- Initially did not have admin access to enable GitHub Pages (resolved with admin's help)
- Learning new Swagger/OpenAPI specification syntax

### Bao
- We had conflicts on the tasks between team member
- The deployment had some issues that took time to fix
- The test cases will need to be updated when the data is fully inserted in the database

**Challenges:**
- Testing task need to wait until the API is deployed

### Shiraz
**Challenges:**
- Successful deployment took several hours.
- Codebase is kind of messy.
  
**Learning:**
- The functions of different start commands.
- How to implement and test endpoints. 

---

## Alpha Sprint Contributions

### Patrick
**Data Analysis & Quality Assurance**
- Analyze the TV shows dataset thoroughly 
- Verify data quality and identify any issues
- Review all project documentation for accuracy
- Verify Swagger documentation matches project plan

### Linda Miao
**Database Design & Implementation**
- Designed normalized ER diagram (11 tables, Third Normal Form)
- Created SQL schema for PostgreSQL/Supabase (`init_database.sql`)
- Developed Python data migration script (`import_tv_shows.py`)
- Successfully imported 7,316 TV shows with full cast and crew data (99.1% success rate)
- Extracted and normalized: 35,739 actors, 18 genres, 465 networks, 5,897 studios, 5,604 creators
- Created comprehensive database documentation (`database_README.md`)
- **Files:** `project_files/er_diagram.png`, `init_database.sql`, `import_tv_shows.py`, `database_README.md`

### Shiannel
**API Designer & Swagger Documentation**
- Analyzed the TV shows dataset and designed the API endpoint structure
- Created Swagger/OpenAPI YAML documentation file for the entire API
- Documented all endpoints with their request/response formats and examples
- Defined data schemas for TV shows, pagination, and error handling
- Added API key security requirements to protect all endpoints
- **Files:** `project_files/swagger.yaml`

### Bao
**Investigate hosting options**
- Research several hosting options for the Helloword API
- Try to deploy the Helloword API on different hosting services like Render, Railway and Koyeb
- Describe the information of the deployments
- **Files:** `project_files/TCSS460-Group7-Hosting Options.docx`

### Shiraz
**Project Plan**
Wrote the Project Plan:
- Describes how the API, once completed, should function and behave
- Provides information useful to a user of the API, but does not provide details about the underlying technicalities
-**Files:** `project_files/Project_Plan.pdf`

---

## Alpha Sprint Comments

**Database (Linda Miao):**
- Successfully designed and implemented. All tables created and populated with production data.
- Data Quality: 99.1% import success rate (7,316 of 7,382 shows). 66 records failed due to VARCHAR length constraints (can be fixed if needed).
- Performance: Database optimized with indexes on frequently queried columns. Average query time <100ms.

**Hosting Options (Bao Thinh Diep)**
- Tried several options for hosting web service.
- Some services are not sucessfull deployed.
- Render and Koyeb are the easiest deployments so far.

**API Documentation (Shiannel/Coco):**
- Swagger/OpenAPI specification completed and validated
- Documented 11 endpoints, including CRUD operations and search/filter features
- Added API key authentication requirements across all endpoints
- File pushed to GitHub at project_files/swagger.yaml and ready for implementation

**Project Plan (Shiraz)**
- The document in its current form describes the complete API.
- However, it the specifications only describe the essential functions that such an API should have.
- Additional functions may be added later, if time permits. Therefore, the document (and final product) is subject to change.

**Testing and review (Patrick Quaidoo)** 
- Made Dataset doc outlining the different datatypes in the .csv.
- Reviewed ER diagram and sql initialization script for accuracy.
- Reviewed and edited swagger yaml file to fit csv types.


---
