# Computer Science · Class 12: Unit Test: Relational Databases and SQL

20 marks · 45 minutes. Copy each question and model answer into the Grade page, with the marks shown.

## Question 1 (1 mark)

**Question:** Which key uniquely identifies each row of a table? Options: (A) foreign key, (B) primary key, (C) composite attribute, (D) alternate index.

**Model answer:**

(B) primary key

## Question 2 (1 mark)

**Question:** Which SQL command removes a table's structure and all its data permanently? Options: (A) DELETE, (B) TRUNCATE, (C) DROP, (D) REMOVE.

**Model answer:**

(C) DROP

## Question 3 (3 marks)

**Question:** What is a foreign key? Explain with an example.

**Model answer:**

- A foreign key is a column in one table that refers to the primary key of another table and links the two tables (2 marks).
- A correct example, e.g. customer_id in ORDERS referring to CUSTOMERS(customer_id) (1 mark).

## Question 4 (3 marks)

**Question:** What is normalisation? Name the three anomalies it removes.

**Model answer:**

- Normalisation is organising data into well-structured tables to reduce redundancy and dependency (1.5 marks).
- It removes the insertion, update and deletion anomalies (1.5 marks, 0.5 each).

## Question 5 (4 marks)

**Question:** Differentiate between DDL and DML, giving two examples of commands for each.

**Model answer:**

- DDL (Data Definition Language) defines or changes the structure of database objects (1 mark); examples CREATE, ALTER, DROP (1 mark).
- DML (Data Manipulation Language) works on the data stored in tables (1 mark); examples INSERT, UPDATE, DELETE (1 mark).

## Question 6 (4 marks)

**Question:** Write an SQL query to display the name and marks of students who scored more than 80, sorted by marks from highest to lowest, from the table STUDENT(roll_no, name, marks).

**Model answer:**

SELECT name, marks FROM STUDENT WHERE marks > 80 ORDER BY marks DESC;
- SELECT name, marks (1 mark), FROM STUDENT (1 mark), WHERE marks > 80 (1 mark), ORDER BY marks DESC (1 mark).

## Question 7 (4 marks)

**Question:** Explain 1NF, 2NF and 3NF briefly.

**Model answer:**

- 1NF: every column holds atomic values and there are no repeating groups (1 mark).
- 2NF: in 1NF and no partial dependency of a non-key attribute on part of a composite key (1.5 marks).
- 3NF: in 2NF and no transitive dependency; non-key attributes depend only on the key (1.5 marks).
