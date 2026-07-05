## Objective
* This is closed group coffee ordering web platform


## Features
* Anyone can signup using phone number and name
* We need innovative way to maintain login as we do not plan to store passwords in data store
* Whatsapp OTP is an option
* There are 2 slots 10 AM and 3 PM , when coffee is prepared
* One can select any slot for which they need coffee that day
* one can also book coffee for entire week any or all slots
* Cost of coffee needs to configurable currently is INR 12 for black coffee and INR 14 for coffee with milk and sugar.
* System should record the the order total and show it to user.
* Money settlemnets can happen out of this system for initial rollout
* A set of "coffee admin" users will see the orders received for that day and slot , so that they can prepare those many cups of coffee
* A user will see how much money it owes based on the coffee he/she ordered
* A  "coffee admin" users will see how much each user need to pay, once " "coffee admin" users " receive money in offline mode, they can settle the account, after which the user owes INR 0 .
* Use modern and user friednly UI design
* Make sure the system is reliable, fault tolerent and takes care of concurrency problems
* Create a deployment and execution plan on vercel , render backend api and neondb postgresql if that tech stack fits in.
